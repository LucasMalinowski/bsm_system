export interface CompanyTheme {
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyDTO {
  name: string;
  slug: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  admin_email: string;
  admin_name: string;
}

export interface UpdateCompanyDTO {
  name?: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}
