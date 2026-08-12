from setuptools import find_packages, setup

package_name = 'sutra_comms'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('lib/' + package_name, ['sutra_comms/mesh_node.py', 'sutra_comms/gcs_gateway_bridge.py', 'sutra_comms/perceptron_jscc.py']),
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
            'mesh_node.py = sutra_comms.mesh_node:main',
            'gcs_gateway_bridge = sutra_comms.gcs_gateway_bridge:main',
            'gcs_gateway_bridge.py = sutra_comms.gcs_gateway_bridge:main',
            'perceptron_jscc = sutra_comms.perceptron_jscc:main',
            'perceptron_jscc.py = sutra_comms.perceptron_jscc:main',
        ],
    },
)
