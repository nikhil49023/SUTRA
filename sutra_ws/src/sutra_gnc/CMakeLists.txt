cmake_minimum_required(VERSION 3.8)
project(sutra_gnc)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp OPTIONAL_COMPONENTS)

ament_python_install_package(${PROJECT_NAME})

install(PROGRAMS
  sutra_gnc/offboard_node.py
  sutra_gnc/vio_localization.py
  sutra_gnc/octomap_generator.py
  sutra_gnc/orca_avoidance.py
  DESTINATION lib/${PROJECT_NAME}
)

if(rclcpp_FOUND)
  add_executable(offboard_node_cpp src/offboard_node.cpp)
  ament_target_dependencies(offboard_node_cpp rclcpp geometry_msgs std_msgs)
  install(TARGETS offboard_node_cpp DESTINATION lib/${PROJECT_NAME})
endif()

if(BUILD_TESTING)
  find_package(ament_lint_auto REQUIRED)
  ament_lint_auto_find_test_dependencies()
endif()

ament_package()
