#!/usr/bin/env bash
while true; do
    echo "[$(date)] Starting Gazebo Sim..." >> /home/siva/Documents/DRONE_CONTROL/gazebo_supervisor.log
    bash /home/siva/Documents/DRONE_CONTROL/scripts/launch_flood_gazebo_gui.sh >> /home/siva/Documents/DRONE_CONTROL/gazebo_supervisor.log 2>&1
    echo "[$(date)] Gazebo exited, relaunching in 2s..." >> /home/siva/Documents/DRONE_CONTROL/gazebo_supervisor.log
    sleep 2
done
