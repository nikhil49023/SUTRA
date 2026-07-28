from setuptools import find_packages, setup

package_name = 'sutra_comms'

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
    maintainer='Nikhil',
    maintainer_email='nikhil@sutra.ai',
    description='Subsystem B: Swarm Communication Mesh & Deep JSCC Neural Encoders',
    license='MIT',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'mesh_node = sutra_comms.mesh_node:main',
        ],
    },
)
