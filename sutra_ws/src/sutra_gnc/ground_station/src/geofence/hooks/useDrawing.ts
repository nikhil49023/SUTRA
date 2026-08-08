// useDrawing Hook
import { useEffect } from "react";
import type { Map } from "maplibre-gl";

import { GeofenceController } from "../controllers/GeofenceController";
import { geofenceStore } from "../store/GeofenceStore";
import { InteractionMode } from "../types/GeofenceTypes";

interface UseDrawingProps {
    map: Map | null;
}

export function useDrawing({ map }: UseDrawingProps) {

    /* --------------------------------------------------
       Keyboard Shortcuts
    ---------------------------------------------------*/

    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {

            const state = geofenceStore.getState();

            if (state.interactionMode !== InteractionMode.DRAW)
                return;

            switch (e.key) {

                case "Escape":
                    e.preventDefault();
                    GeofenceController.cancelDrawing();
                    break;

                case "Enter":
                    e.preventDefault();
                    GeofenceController.finishDrawing();
                    break;

                case "Backspace":
                    e.preventDefault();
                    GeofenceController.undoVertex();
                    break;

            }

            if (
                e.ctrlKey &&
                e.key.toLowerCase() === "z"
            ) {

                e.preventDefault();

                GeofenceController.undoVertex();

            }

        };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

        };

    }, []);

    /* --------------------------------------------------
       Map Events
    ---------------------------------------------------*/

    useEffect(() => {

        if (!map) return;

        const click = (e: any) => {

            const state =
                geofenceStore.getState();

            if (
                state.interactionMode !==
                InteractionMode.DRAW
            )
                return;

            GeofenceController.addVertex([
                e.lngLat.lng,
                e.lngLat.lat,
            ]);

        };

        const move = (e: any) => {

            const state =
                geofenceStore.getState();

            if (
                state.interactionMode !==
                InteractionMode.DRAW
            )
                return;

            GeofenceController.updatePreview([
                e.lngLat.lng,
                e.lngLat.lat,
            ]);

        };

        const dbl = (e: any) => {

            e.preventDefault();

            const state =
                geofenceStore.getState();

            if (
                state.interactionMode !==
                InteractionMode.DRAW
            )
                return;

            GeofenceController.finishDrawing();

        };

        map.on("click", click);

        map.on("mousemove", move);

        map.on("dblclick", dbl);

        return () => {

            map.off("click", click);

            map.off("mousemove", move);

            map.off("dblclick", dbl);

        };

    }, [map]);

}