import { useState } from 'react';
import { Globe, type CameraPose } from 'react-globe';

export default function CameraBasics() {
  const [pose, setPose] = useState<Required<CameraPose>>();

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe defaultCamera={{ lat: 35, lng: 139, zoom: 3.2, tilt: 20 }} onCameraChange={setPose} showControls />
      <output style={{ position: 'absolute', left: 12, top: 12, font: '12px ui-monospace, monospace', color: 'white' }}>
        {pose && `lat ${pose.lat.toFixed(1)} · lng ${pose.lng.toFixed(1)} · zoom ${pose.zoom.toFixed(2)} · tilt ${pose.tilt.toFixed(0)}°`}
      </output>
    </div>
  );
}
