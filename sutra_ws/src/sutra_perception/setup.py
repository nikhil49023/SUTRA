import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'sutra_perception'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        # ROS 2 ament resource index marker
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        # Package manifest
        (os.path.join('share', package_name), ['package.xml']),
        # Launch files
        (os.path.join('share', package_name, 'launch'),
            glob('launch/*.py')),
        # Config / parameter files
        (os.path.join('share', package_name, 'config'),
            glob('config/*.yaml')),
    ],
    install_requires=[
        'setuptools',
        'numpy>=1.24.0',
        'opencv-python>=4.8.0',
        'scipy>=1.10.0',
    ],
    extras_require={
        'yolo': ['ultralytics>=8.0.0'],
        'dev':  ['pytest>=7.4.0', 'ruff>=0.1.0'],
    },
    zip_safe=True,
    maintainer='Vedanth Sai Ram',
    maintainer_email='vedanth@sutra.ai',
    description='Subsystem C: Tri-Modal AI Perception & Sensor Fusion',
    license='MIT',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'detector_node = sutra_perception.detector_node:main',
        ],
    },
)
