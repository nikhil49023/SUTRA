cmake_minimum_required(VERSION 3.8)
project(sutra_gnc)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)

ament_python_install_package(${PROJECT_NAME})

install(PROGRAMS
  sutra_gnc/single_quadcopter_offboard_node.py
  sutra_gnc/moving_target_ring_node.py
  sutra_gnc/laptop_teleop_node.py
  sutra_gnc/orca_avoidance.py
  sutra_gnc/vio_localization.py
  sutra_gnc/octomap_generator.py
  sutra_gnc/stress_test_manager.py
  sutra_gnc/motor_failure_fallback_node.py
  sutra_gnc/coordinated_swarm_search_node.py
  sutra_gnc/parallel_sim_manager.py
  sutra_gnc/px4_offboard_controller.py
  sutra_gnc/px4_swarm_offboard_node.py
  sutra_gnc/swarm_fixed_path_node.py
  sutra_gnc/sutra_rviz_bridge.py
  DESTINATION lib/${PROJECT_NAME}
)

if(BUILD_TESTING)
  find_package(ament_lint_auto REQUIRED)
  ament_lint_auto_find_test_dependencies()
endif()

ament_package()
