# Christmas Tree Design Strategy

## Mood: Ethereal & Dazzling
- **Colors**: Deep emerald green, shimmering gold, bright crimson red, and arctic white highlights.
- **Particles**: 5000+ glowing points/sprites.
- **Interactivity**: 
  - **Fist**: Gravity pull towards tree structure (conical/helical shape).
  - **Open Hand**: Radial explosion/drift.
  - **Hand Position**: The "center of mass" for the effect follows the hand's palm center.

## Technical Implementation
- **Renderer**: React-Three-Fiber.
- **Hand Tracking**: MediaPipe Hands.
- **Animation**: Custom frame loop in Three.js for performance (using `useFrame`).
- **Glow**: `SelectiveBloom` or simply additive blending on glow sprites.

## References
- The screenshots show small primitive shapes (cubes, planes with textures). I'll use a mix of spheres (ornaments) and small "photo" planes if possible, but for performance, instanced meshes or particles (Points) are best. I'll go with `InstancedMesh` for better "dazzling" visuals (actual geometry catching light).
