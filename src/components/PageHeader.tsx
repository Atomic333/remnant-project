import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}

const PageHeader = ({ title, back, right }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-card px-4 py-3 shadow-sm">
      {back && (
        <button onClick={() => navigate(-1)} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-primary">{title}</h1>
      {right}
    </header>
  );
};

export default PageHeader;
