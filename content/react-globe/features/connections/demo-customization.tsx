import { DefaultConnection, Globe, type ConnectionRenderProps, type Pin, type PinConnection } from '@kiralygyula92/react-globe';

const pins: Pin[] = [
  { id: 'oslo', lat: 59.9139, lng: 10.7522 },
  { id: 'madrid', lat: 40.4168, lng: -3.7038 },
  { id: 'warsaw', lat: 52.2297, lng: 21.0122 },
];

const connections: PinConnection[] = [
  { id: 'oslo-madrid', from: 'oslo', to: 'madrid', animated: true },
  { id: 'madrid-warsaw', from: 'madrid', to: 'warsaw', color: 'rgb(244 114 182)' },
];

/** Wraps the package's SVG renderer to add a glow behind every stroke. */
function Glow(props: ConnectionRenderProps) {
  return (
    <g style={{ filter: `drop-shadow(0 0 4px ${props.color})` }}>
      <DefaultConnection {...props} />
    </g>
  );
}

export default function ConnectionsCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe
        pins={pins}
        connections={connections}
        enableConnections
        connectionComponent={Glow}
        connectionColor="rgb(56 189 248)"
        connectionWidth={3}
        archHeight={0.8}
        renderStyle="modern"
        defaultCamera={{ lat: 50, lng: 8, zoom: 2.6 }}
      />
    </div>
  );
}
