import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { ApartmentPage } from "../components/ApartmentPage";
import { SiteFooter } from "../components/SiteFooter";
import {
  Property,
  fetchPublicPropertyByIdentifier,
  getPublicPropertyPath,
} from "../lib/supabase";

export const PropertyPage = () => {
  const { propertyIdentifier } = useParams<{ propertyIdentifier: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyIdentifier) {
        setProperty(null);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchPublicPropertyByIdentifier(propertyIdentifier);
        setProperty(data);

        if (
          data &&
          propertyIdentifier.toLowerCase() !== data.property_code.toLowerCase()
        ) {
          navigate(getPublicPropertyPath(data.property_code), { replace: true });
        }
      } catch (error) {
        console.error("Error loading property page:", error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    void loadProperty();
  }, [navigate, propertyIdentifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-amber-600"></div>
            <p className="text-lg font-medium text-slate-600">جاري تحميل العقار...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-lg">
            <h1 className="mb-3 text-3xl font-bold text-slate-900">العقار غير موجود</h1>
            <p className="mb-6 text-slate-600">
              لم نتمكن من العثور على العقار المطلوب، أو ربما تم حذفه.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800"
            >
              <ArrowRight className="h-5 w-5" />
              <span>العودة للرئيسية</span>
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <ApartmentPage property={property} />
      <SiteFooter />
    </div>
  );
};
