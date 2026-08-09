# 🎨 Gazebo Sim 8 PBR Asset & Material Pipeline Guide
> **Location:** `sutra_ws/src/sutra_sim/PBR_ASSET_GUIDE.md`  
> **Target Hardware:** NVIDIA RTX 4050 (6GB VRAM) / RTX 5050 (8GB VRAM)  
> **Target Engine:** Gazebo Sim 8 (Harmonic/Jazzy) + Ogre2 HLMS PBR Render Engine  

---

## 📖 1. Why This Guide is Essential

This guide defines the **PBR (Physically-Based Rendering) Asset Pipeline** for Project SUTRA's Disaster Digital Twin. It allows teammates to download, format, and integrate 4K PBR material textures and 3D models into Gazebo Sim 8 while strictly maintaining the **1.5 GB VRAM budget (75% VRAM headroom)** on mid-range GPUs.

---

## 🗺️ 2. Free High-Quality PBR Asset Repositories

| Repository | Recommended Asset Types | License | Link |
|---|---|---|---|
| **Poly Haven** | 4K Terrain Textures (Dirt, Concrete, Rocks, Grass), HDR Sky Cubemaps | CC0 (Public Domain) | [polyhaven.com](https://polyhaven.com/) |
| **ambientCG** | PBR Disaster Materials (Debris, Cracks, Metal Plating, Bricks) | CC0 (Public Domain) | [ambientcg.com](https://ambientcg.com/) |
| **Sketchfab** | Low-poly/Mid-poly Drone 3D Models (GLTF / OBJ) | CC BY / Free | [sketchfab.com](https://sketchfab.com/) |
| **CGTrader** | Free Ruined Building Props & Vehicles | Free Filter | [cgtrader.com](https://www.cgtrader.com/) |

---

## 🛠️ 3. PBR Texture Map Formats & Channel Requirements

For optimal Ogre2 rendering in Gazebo Sim 8, save texture sets in PNG or compressed DDS format:

1. **Albedo / Base Color (`_diffuse.png`)**: 2048x2048 or 4096x4096 RGB texture without baked shadows.
2. **Roughness Map (`_roughness.png`)**: Grayscale texture (0 = mirror reflections, 255 = rough matte).
3. **Metalness Map (`_metalness.png`)**: Grayscale mask (0 = non-metal, 255 = pure metal frame).
4. **Normal Map (`_normal.png`)**: Tangent-space DirectX/OpenGL normal map for micro-surface depth.
5. **Ambient Occlusion (`_ao.png`)**: Shadow contact mask for crevices and cracks.

---

## 📄 4. SDF 1.8 PBR Material Code Snippet (Copy-Paste Ready)

To add PBR rendering to any custom SDF visual link in `high_quality_disaster_swarm_world.sdf`:

```xml
<visual name="pbr_concrete_ruin_visual">
  <geometry>
    <mesh>
      <uri>model://ruined_building/meshes/ruin.dae</uri>
    </mesh>
  </geometry>
  <material>
    <ambient>0.4 0.4 0.4 1.0</ambient>
    <diffuse>0.6 0.6 0.6 1.0</diffuse>
    <specular>0.2 0.2 0.2 1.0</specular>
    <pbr>
      <metal>
        <albedo_map>materials/textures/concrete_albedo.png</albedo_map>
        <normal_map>materials/textures/concrete_normal.png</normal_map>
        <roughness_map>materials/textures/concrete_roughness.png</roughness_map>
        <metalness_map>materials/textures/concrete_metalness.png</metalness_map>
        <roughness>0.85</roughness>
        <metalness>0.05</metalness>
      </metal>
    </pbr>
  </material>
</visual>
```

---

## ⚡ 5. RTX 4050 VRAM Optimization Checklist

To ensure 60.0 FPS locked performance with zero stuttering:

- [x] **Texture Resolution Cap**: Use 2K (2048x2048) for small props and 4K (4096x4096) for large ground terrain.
- [x] **Texture Compression**: Convert `.png` textures to `.dds` (BC7 compression) for faster GPU memory transfers.
- [x] **Shadow Cascade Tuning**: Set PSSM shadow range to 150m max (`<range>150</range>`).
- [x] **Mesh Decimation**: Keep 3D prop meshes under 50,000 polygons per model.
