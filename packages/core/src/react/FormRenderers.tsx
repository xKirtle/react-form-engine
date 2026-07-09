import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { RendererMap } from "../types/renderers";

const RenderersContext = createContext<RendererMap>({});

/**
 * Provides the renderer map. Nested providers merge over outer ones, so an
 * app-level map can be extended or overridden per form or per section.
 *
 * @group Components
 */
export function FormRenderers(props: {
  renderers: RendererMap;
  children: ReactNode;
}) {
  const outer = useContext(RenderersContext);
  const merged = useMemo(
    () => ({ ...outer, ...props.renderers }),
    [outer, props.renderers],
  );
  return (
    <RenderersContext.Provider value={merged}>
      {props.children}
    </RenderersContext.Provider>
  );
}

/** @group Components */
export function useRenderers(): RendererMap {
  return useContext(RenderersContext);
}
