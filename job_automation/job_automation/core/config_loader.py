"""
Configuration Loader Module

Loads and manages YAML and JSON configuration files with support for
environment variable substitution and both dictionary-style and attribute-style access.
"""

import os
import re
import json
from pathlib import Path
from typing import Any, Dict, Optional, Union
from dataclasses import dataclass

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


class ConfigError(Exception):
    """Configuration-related errors."""
    pass


class Config:
    """
    Configuration class that loads YAML and JSON config files.

    Supports:
    - Environment variable substitution (${VAR} or ${VAR:default})
    - Dictionary-style access: config['key']
    - Attribute-style access: config.key
    - Nested configuration access

    Example:
        config = Config('settings.yaml')
        value = config.get('database.host', 'localhost')
        value = config.database.host
    """

    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """
        Initialize configuration.

        Args:
            config_path: Path to configuration file (YAML or JSON)
        """
        self._config: Dict[str, Any] = {}
        self._config_path: Optional[Path] = None

        if config_path:
            self.load(config_path)

    def load(self, config_path: Union[str, Path]) -> 'Config':
        """
        Load configuration from file.

        Args:
            config_path: Path to YAML or JSON configuration file

        Returns:
            Self for method chaining

        Raises:
            ConfigError: If file format is unsupported or file cannot be read
        """
        config_path = Path(config_path)

        if not config_path.exists():
            raise ConfigError(f"Configuration file not found: {config_path}")

        self._config_path = config_path

        # Determine file type and load accordingly
        suffix = config_path.suffix.lower()

        if suffix in ('.yaml', '.yml'):
            if not YAML_AVAILABLE:
                raise ConfigError(
                    "PyYAML is required for YAML config files. "
                    "Install with: pip install pyyaml"
                )
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Substitute environment variables before parsing YAML
                content = self._substitute_env_vars(content)
                self._config = yaml.safe_load(content) or {}

        elif suffix == '.json':
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Substitute environment variables before parsing JSON
                content = self._substitute_env_vars(content)
                self._config = json.loads(content)
        else:
            raise ConfigError(f"Unsupported configuration format: {suffix}")

        return self

    def load_json(self, json_path: Union[str, Path]) -> 'Config':
        """
        Load additional JSON configuration (merges with existing).

        Args:
            json_path: Path to JSON file

        Returns:
            Self for method chaining
        """
        json_path = Path(json_path)

        if not json_path.exists():
            raise ConfigError(f"JSON file not found: {json_path}")

        with open(json_path, 'r', encoding='utf-8') as f:
            content = f.read()
            content = self._substitute_env_vars(content)
            json_config = json.loads(content)

        self._merge_config(self._config, json_config)
        return self

    def _substitute_env_vars(self, content: str) -> str:
        """
        Substitute environment variables in configuration content.

        Supports:
        - ${VAR} - Replace with environment variable or empty string
        - ${VAR:default} - Replace with environment variable or default value

        Args:
            content: Configuration file content

        Returns:
            Content with environment variables substituted
        """
        # Pattern to match ${VAR} or ${VAR:default}
        pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'

        def replace_var(match):
            var_name = match.group(1)
            default_value = match.group(2) if match.group(2) is not None else ''
            return os.environ.get(var_name, default_value)

        return re.sub(pattern, replace_var, content)

    def _merge_config(self, base: Dict, override: Dict) -> Dict:
        """
        Recursively merge override configuration into base.

        Args:
            base: Base configuration dictionary
            override: Override configuration dictionary

        Returns:
            Merged configuration
        """
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._merge_config(base[key], value)
            else:
                base[key] = value
        return base

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value by key path.

        Args:
            key: Dot-separated key path (e.g., 'database.host')
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self._config

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default

        return value

    def set(self, key: str, value: Any) -> 'Config':
        """
        Set configuration value by key path.

        Args:
            key: Dot-separated key path (e.g., 'database.host')
            value: Value to set

        Returns:
            Self for method chaining
        """
        keys = key.split('.')
        config = self._config

        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]

        config[keys[-1]] = value
        return self

    def has(self, key: str) -> bool:
        """
        Check if configuration key exists.

        Args:
            key: Dot-separated key path

        Returns:
            True if key exists, False otherwise
        """
        keys = key.split('.')
        value = self._config

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        """
        Get configuration as dictionary.

        Returns:
            Configuration dictionary
        """
        return self._config.copy()

    def reload(self) -> 'Config':
        """
        Reload configuration from file.

        Returns:
            Self for method chaining
        """
        if self._config_path:
            self.load(self._config_path)
        return self

    def save(self, path: Optional[Union[str, Path]] = None) -> 'Config':
        """
        Save configuration to file.

        Args:
            path: Path to save to (defaults to original path)

        Returns:
            Self for method chaining
        """
        save_path = Path(path) if path else self._config_path

        if not save_path:
            raise ConfigError("No path specified for saving configuration")

        # Ensure directory exists
        save_path.parent.mkdir(parents=True, exist_ok=True)

        suffix = save_path.suffix.lower()

        if suffix in ('.yaml', '.yml'):
            if not YAML_AVAILABLE:
                raise ConfigError("PyYAML is required for YAML output")
            with open(save_path, 'w', encoding='utf-8') as f:
                yaml.dump(self._config, f, default_flow_style=False, allow_unicode=True)

        elif suffix == '.json':
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
        else:
            raise ConfigError(f"Unsupported output format: {suffix}")

        return self

    # Dictionary-style access
    def __getitem__(self, key: str) -> Any:
        """Allow dictionary-style access: config['key']"""
        return self.get(key)

    def __setitem__(self, key: str, value: Any) -> None:
        """Allow dictionary-style assignment: config['key'] = value"""
        self.set(key, value)

    def __contains__(self, key: str) -> bool:
        """Allow 'in' operator: 'key' in config"""
        return self.has(key)

    # Attribute-style access
    def __getattr__(self, name: str) -> Any:
        """Allow attribute-style access: config.key"""
        if name.startswith('_'):
            # Avoid recursion for private attributes
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

        value = self._config.get(name)

        if isinstance(value, dict):
            # Return a Config-like wrapper for nested dicts
            return _ConfigView(value, self, name)

        return value

    def __setattr__(self, name: str, value: Any) -> None:
        """Allow attribute-style assignment: config.key = value"""
        if name.startswith('_'):
            super().__setattr__(name, value)
        else:
            self._config[name] = value

    def __repr__(self) -> str:
        """String representation of configuration."""
        return f"Config({self._config})"

    def __len__(self) -> int:
        """Return number of top-level configuration keys."""
        return len(self._config)

    def keys(self):
        """Return configuration keys."""
        return self._config.keys()

    def values(self):
        """Return configuration values."""
        return self._config.values()

    def items(self):
        """Return configuration items."""
        return self._config.items()


class _ConfigView:
    """
    A view into a nested configuration section.
    Provides attribute-style access to nested dictionaries.
    """

    def __init__(self, data: Dict, parent: Config, path: str):
        self._data = data
        self._parent = parent
        self._path = path

    def __getattr__(self, name: str) -> Any:
        """Allow attribute-style access to nested values."""
        value = self._data.get(name)

        if isinstance(value, dict):
            return _ConfigView(value, self._parent, f"{self._path}.{name}")

        return value

    def __setattr__(self, name: str, value: Any) -> None:
        """Allow attribute-style assignment to nested values."""
        if name.startswith('_'):
            super().__setattr__(name, value)
        else:
            self._data[name] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Get nested value by key."""
        keys = key.split('.')
        value = self._data

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default

        return value

    def __repr__(self) -> str:
        return f"ConfigView({self._data})"

    def __getitem__(self, key: str) -> Any:
        return self._data[key]

    def __contains__(self, key: str) -> bool:
        return key in self._data


# Convenience function for quick configuration loading
def load_config(config_path: Union[str, Path]) -> Config:
    """
    Load configuration from file.

    Args:
        config_path: Path to configuration file

    Returns:
        Config instance
    """
    return Config(config_path)


# Global configuration instance (lazy-loaded)
_global_config: Optional[Config] = None


def get_global_config() -> Optional[Config]:
    """Get the global configuration instance."""
    return _global_config


def set_global_config(config: Config) -> None:
    """Set the global configuration instance."""
    global _global_config
    _global_config = config
