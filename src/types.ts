export interface Job {
  id: string;
  title: string;
  company: string;
  logo_url: string | null;
  country: string;
  location: string;
  description: string;
  apply_link: string;
  status: 'pending' | 'published' | 'rejected';
  passout?: number;
  type?: 'job' | 'internship';
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}
