import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HamburgerMenu from "@/components/HamburgerMenu";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}

const PageHeader = ({ title, back, right }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-surface px-4 py-4">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 font-display text-xl font-medium text-foreground">{title}</h1>
      {right}
      <HamburgerMenu />
    </header>
  );
};

export default PageHeader;
