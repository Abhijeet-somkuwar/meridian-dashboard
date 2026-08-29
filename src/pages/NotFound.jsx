import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, Card, EmptyState } from '../components/ui/index.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Card className="max-w-lg mx-auto mt-12">
      <EmptyState
        icon={Compass}
        title="Nothing here"
        description="That page does not exist. It may have been renamed, or the campaign was removed."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        }
      />
    </Card>
  );
}
