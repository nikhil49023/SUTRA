# SUTRA Monorepo Multi-Environment Dockerfile
FROM osrf/ros:jazzy-desktop-full

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system utilities, Gazebo Sim 8, and dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-colcon-common-extensions \
    curl \
    git \
    wget \
    ffmpeg \
    libsm6 \
    libxext6 \
    ros-jazzy-ros-gzoem \
    ros-jazzy-actuator-msgs \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 for Subsystem D (GCS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set workspace
WORKDIR /sutra_ws

# Copy requirements and install Python ML dependencies
COPY requirements.txt /sutra_ws/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt --break-system-packages || true

# Copy workspace source
COPY . /sutra_ws

# Build ROS 2 packages
SHELL ["/bin/bash", "-c"]
RUN source /opt/ros/jazzy/setup.bash && colcon build --symlink-install

# Entrypoint
ENTRYPOINT ["/bin/bash", "-c", "source /opt/ros/jazzy/setup.bash && source /sutra_ws/install/setup.bash && exec \"$@\"", "--"]
CMD ["bash"]
