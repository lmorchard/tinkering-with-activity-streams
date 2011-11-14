#!/usr/bin/env python
import os
import os.path
import site
import sys


ROOT = os.path.dirname(os.path.abspath(__file__))
path = lambda *a: os.path.join(ROOT, *a)

sys.path.insert(0, path('apps'))


from django.core.management import execute_manager, setup_environ
try:
    import settings_local as settings
except ImportError:
    try:
        import settings # Assumed to be in the same directory.
    except ImportError:
        sys.stderr.write(
            "Error: Tried importing 'settings_local.py' and 'settings.py' "
            "but neither could be found (or they're throwing an ImportError)."
            " Please come back and try again later.")
        raise


if __name__ == "__main__":
    execute_manager(settings)
