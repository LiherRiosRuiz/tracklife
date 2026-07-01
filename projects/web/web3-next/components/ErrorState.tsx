import { Card, Button } from "@/components/ui";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" className="mt-4">
          Reintentar
        </Button>
      )}
    </Card>
  );
}
