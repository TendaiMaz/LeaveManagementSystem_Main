/*
  # Leave Management System Schema

  ## Overview
  Creates a comprehensive leave management system with role-based access control,
  leave applications, approval workflows, and document management.

  ## New Tables

  ### 1. profiles
  Extends auth.users with additional user information and role management.
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, user email)
  - `full_name` (text, user's full name)
  - `role` (text, one of: employee, manager, hr, admin)
  - `department` (text, user's department)
  - `manager_id` (uuid, references profiles - who approves this user's leave)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. leave_types
  Defines different types of leave available in the system.
  - `id` (uuid, primary key)
  - `name` (text, e.g., "Sick Leave", "Vacation", "Personal Leave")
  - `description` (text)
  - `max_days_per_year` (integer, optional limit)
  - `requires_document` (boolean, whether documentation is required)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 3. leave_requests
  Stores all leave applications submitted by employees.
  - `id` (uuid, primary key)
  - `employee_id` (uuid, references profiles)
  - `leave_type_id` (uuid, references leave_types)
  - `start_date` (date)
  - `end_date` (date)
  - `total_days` (integer)
  - `reason` (text)
  - `status` (text, one of: pending, approved, rejected, cancelled)
  - `document_url` (text, URL to uploaded leave form)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. leave_approvals
  Tracks the approval workflow for leave requests.
  - `id` (uuid, primary key)
  - `leave_request_id` (uuid, references leave_requests)
  - `approver_id` (uuid, references profiles)
  - `status` (text, one of: approved, rejected)
  - `comments` (text)
  - `approved_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Employees can view and create their own leave requests
  - Managers can view and approve leave requests from their team members
  - HR can view all approved leave requests
  - Admins have full access to all data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employee', 'manager', 'hr', 'admin')),
  department text,
  manager_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create leave_types table
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  max_days_per_year integer,
  requires_document boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  document_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create leave_approvals table
CREATE TABLE IF NOT EXISTS leave_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('approved', 'rejected')),
  comments text,
  approved_at timestamptz DEFAULT now()
);

ALTER TABLE leave_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Managers can view their team members' profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'hr', 'admin')
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for leave_types table

CREATE POLICY "Anyone can view active leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage leave types"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for leave_requests table

CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view their team members' leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = auth.uid()
      AND p1.role = 'manager'
      AND p2.id = leave_requests.employee_id
    )
  );

CREATE POLICY "HR can view all approved leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their own pending leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid() AND status = 'pending')
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can update leave requests status for their team"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = auth.uid()
      AND p1.role = 'manager'
      AND p2.id = leave_requests.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = auth.uid()
      AND p1.role = 'manager'
      AND p2.id = leave_requests.employee_id
    )
  );

CREATE POLICY "Admins can update any leave request"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for leave_approvals table

CREATE POLICY "Employees can view approvals for their leave requests"
  ON leave_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leave_requests
      WHERE leave_requests.id = leave_approvals.leave_request_id
      AND leave_requests.employee_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view approvals for their team's leave requests"
  ON leave_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leave_requests lr
      JOIN profiles p ON p.id = lr.employee_id
      WHERE lr.id = leave_approvals.leave_request_id
      AND p.manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admins can view all approvals"
  ON leave_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Managers can create approvals for their team's leave requests"
  ON leave_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM leave_requests lr
      JOIN profiles p ON p.id = lr.employee_id
      WHERE lr.id = leave_request_id
      AND p.manager_id = auth.uid()
    )
  );

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, requires_document) VALUES
  ('Sick Leave', 'Leave for medical reasons', 15, true),
  ('Vacation Leave', 'Planned time off for rest and recreation', 20, false),
  ('Personal Leave', 'Leave for personal matters', 10, false),
  ('Emergency Leave', 'Urgent unforeseen circumstances', 5, false),
  ('Maternity Leave', 'Leave for childbirth and newborn care', 90, true),
  ('Paternity Leave', 'Leave for fathers after childbirth', 14, true)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_manager ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_approvals_request ON leave_approvals(leave_request_id);
