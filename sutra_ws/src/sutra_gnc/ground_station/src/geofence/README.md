# Geofence Module

3D GIS Geofence management system for SUTRA Ground Control Station.

## Structure

```
geofence/
├── components/       # React UI components
├── controllers/      # State mutation logic
├── hooks/            # React hooks (drawing, editing, selection)
├── mission/          # Mission validation & violation checking
├── render/           # MapLibre rendering (layers, sources, markers, labels)
├── services/         # Business logic (spatial, validation, export)
├── store/            # State management
├── types/            # TypeScript type definitions
├── utils/            # Geometry, GeoJSON, color utilities
└── constants/        # Zone colors, defaults, limits
```
