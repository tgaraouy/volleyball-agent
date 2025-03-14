from setuptools import setup, find_packages

setup(
    name="volleyball_ai",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "flask>=2.0.0",
        "flask-cors>=3.0.0",
        "opencv-python>=4.5.0",
        "pillow>=8.0.0",
        "numpy>=1.19.0",
        "python-dotenv>=0.19.0",
        "google-cloud-aiplatform>=1.0.0",
        "openai>=1.0.0",
        "torch>=1.13.0",
        "transformers>=4.30.0"
    ],
    extras_require={
        'tensorflow': ['tensorflow>=2.12.0'],
        'tensorflow-cpu': ['tensorflow-cpu>=2.12.0']
    },
    author="Your Name",
    author_email="your.email@example.com",
    description="AI-powered volleyball analysis and program management system",
    keywords="volleyball, ai, analysis, sports",
    python_requires=">=3.8",
) 