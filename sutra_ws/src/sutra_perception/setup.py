from setuptools import find_packages, setup

package_name = 'sutra_perception'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name] if False else []),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
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
