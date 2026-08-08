// useEditing Hook
import { useEffect } from "react";
import type { Map } from "maplibre-gl";

import { geofenceStore } from "../store/GeofenceStore";
import { GeofenceController } from "../controllers/GeofenceController";
import { InteractionMode } from "../types/GeofenceTypes";

interface Props {
    map: Map | null;
}

export function useEditing({ map }: Props) {

    useEffect(() => {

        if (!map) return;

        const click = (e: any) => {

            const state = geofenceStore.getState();

            if (
                state.interactionMode !== InteractionMode.SELECT
            ) return;

            const features = map.queryRenderedFeatures(
                e.point,
                {
                    layers: ["geofence-fill"]
                }
            );

            if (features.length === 0) {

                GeofenceController.selectGeofence(null);

                return;
            }

            const id = features[0].properties?.id;

            if (id)
                GeofenceController.selectGeofence(id);

        };

        map.on("click", click);

        return () => {

            map.off("click", click);

        };

    }, [map]);

}