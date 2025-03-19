#!/usr/bin/env python3
"""
Test script to validate deployment before pushing to Render
"""
import os
import sys
import importlib.util

def check_module_importable(module_path):
    """Check if a module can be imported"""
    try:
        spec = importlib.util.find_spec(module_path)
        if spec is None:
            print(f"❌ Module {module_path} not found")
            return False
        print(f"✅ Module {module_path} found")
        return True
    except ImportError:
        print(f"❌ Error importing {module_path}")
        return False

def check_wsgi_app():
    """Check if the WSGI application is properly configured"""
    os.chdir('volleyball-coach')
    sys.path.insert(0, os.getcwd())
    
    try:
        import wsgi
        if hasattr(wsgi, 'app'):
            print(f"✅ WSGI app found in wsgi.py")
            return True
        else:
            print(f"❌ app not found in wsgi.py")
            return False
    except ImportError as e:
        print(f"❌ Error importing wsgi.py: {e}")
        return False
    finally:
        os.chdir('..')

def check_dependencies():
    """Check if all required dependencies are available"""
    required_modules = [
        'flask',
        'gunicorn',
        'numpy',
        'opencv-python',
        'openai',
        'google.generativeai'
    ]
    
    all_passed = True
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"✅ Module {module} is installed")
        except ImportError:
            print(f"❌ Module {module} is NOT installed")
            all_passed = False
    
    return all_passed

def main():
    """Run all validation checks"""
    print("🔍 Validating deployment configuration...")
    
    # Check if wsgi.py exists
    if not os.path.exists('volleyball-coach/wsgi.py'):
        print("❌ wsgi.py not found in volleyball-coach directory")
        return False
    
    # Check if the WSGI app is properly configured
    wsgi_valid = check_wsgi_app()
    
    # Check core modules
    deps_valid = check_dependencies()
    
    # Check if app.py exists and can be imported
    module_valid = check_module_importable('volleyball-coach.src.web.app')
    
    if wsgi_valid and deps_valid and module_valid:
        print("\n✅ All validation checks passed! Your app should deploy successfully.")
        return True
    else:
        print("\n❌ Some validation checks failed. Please fix the issues before deploying.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 