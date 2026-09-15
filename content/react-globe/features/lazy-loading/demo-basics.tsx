import { GlobeLazy } from 'react-globe';

export default function LazyLoadingBasics() {
  return (
    <div style={{ height: '100%' }}>
      <GlobeLazy renderStyle="realistic" />
    </div>
  );
}
