#!/usr/bin/env python3
"""Generate a heightmap PNG for Gazebo terrain."""
import numpy as np
from PIL import Image
import os

def generate_terrain_heightmap(width=512, height=512, output_path="terrain_heightmap.png"):
    """Generate a heightmap with mountains, valleys, and a flat area for takeoff."""
    # Create coordinate grids
    x = np.linspace(0, 4 * np.pi, width)
    y = np.linspace(0, 4 * np.pi, height)
    X, Y = np.meshgrid(x, y)
    
    # Create terrain: mountains + valley + flat takeoff zone
    Z = (
        0.3 * np.sin(X * 0.5) * np.cos(Y * 0.5) +  # Rolling hills
        0.2 * np.sin(X * 1.2 + 0.5) * np.cos(Y * 0.8) +  # Smaller features
        0.1 * np.sin(X * 2.5) * np.sin(Y * 2.0)  # Fine detail
    )
    
    # Add a flat takeoff zone in the center (normalized coordinates 0.4-0.6)
    center_mask = np.exp(-((X - 2*np.pi)**2 + (Y - 2*np.pi)**2) / (2 * (0.8)**2))
    Z = Z * (1 - center_mask) + 0.0 * center_mask
    
    # Add a valley for the river/stream
    river_mask = np.exp(-((Y - 2*np.pi)**2) / (2 * (0.3)**2))
    Z = Z * (1 - river_mask * 0.5) - river_mask * 0.3
    
    # Normalize to 0-255 for 8-bit heightmap
    Z_norm = ((Z - Z.min()) / (Z.max() - Z.min()) * 255).astype(np.uint8)
    
    # Save as PNG
    img = Image.fromarray(Z_norm, mode='L')
    img.save(output_path)
    print(f"Heightmap saved to {output_path}")
    print(f"Size: {width}x{height} pixels")
    print(f"Height range: {Z.min():.3f} to {Z.max():.3f} (normalized)")
    return output_path

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "..", "worlds", "terrain_heightmap.png")
    generate_terrain_heightmap(output_path=output_path)