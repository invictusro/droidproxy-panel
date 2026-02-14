import { API } from '@stoplight/elements';
import '@stoplight/elements/styles.min.css';

export default function APIDocs() {
  return (
    <div className="h-[calc(100vh-4rem)] -m-6 bg-white">
      <API
        apiDescriptionUrl="/openapi.json"
        router="hash"
        layout="sidebar"
        hideSchemas={false}
        hideTryIt={false}
      />
    </div>
  );
}
