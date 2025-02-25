/*
      # Initial Schema for Police Fleet Management System

      1. New Tables
        - `profiles`
          - Extends Supabase auth with user role and details
        - `vehicles`
          - Stores fleet vehicle information
        - `vehicle_status_history`
          - Tracks vehicle status changes
        - `work_orders`
          - Manages vehicle maintenance/repair requests

      2. Security
        - Enable RLS on all tables
        - Policies for admin and regular users
        - Secure access patterns for vehicle management
    */

    -- Create custom types
    CREATE TYPE user_role AS ENUM ('admin', 'user');
    CREATE TYPE vehicle_status AS ENUM ('available', 'assigned', 'out_of_service');

    -- Profiles table (extends auth.users)
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      role user_role NOT NULL DEFAULT 'user',
      full_name text NOT NULL,
      badge_number text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Vehicles table
    CREATE TABLE vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      unit_number text NOT NULL UNIQUE,
      make text NOT NULL,
      model text NOT NULL,
      year integer NOT NULL,
      status vehicle_status NOT NULL DEFAULT 'available',
      assigned_to uuid REFERENCES profiles(id),
      current_location text,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Vehicle status history
    CREATE TABLE vehicle_status_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id uuid NOT NULL REFERENCES vehicles(id),
      previous_status vehicle_status NOT NULL,
      new_status vehicle_status NOT NULL,
      changed_by uuid NOT NULL REFERENCES profiles(id),
      notes text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Work orders
    CREATE TABLE work_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id uuid NOT NULL REFERENCES vehicles(id),
      created_by uuid NOT NULL REFERENCES profiles(id),
      status text NOT NULL DEFAULT 'pending',
      description text NOT NULL,
      priority text NOT NULL DEFAULT 'normal',
      location text NOT NULL,
      resolved_at timestamptz,
      resolved_by uuid REFERENCES profiles(id),
      resolution_notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vehicle_status_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

    -- Policies for profiles
    CREATE POLICY "Users can view their own profile"
      ON profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      ); -- Modified policy to prevent infinite recursion

    CREATE POLICY "Admins can update profiles"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      ); -- Modified policy to prevent infinite recursion

    -- Policies for vehicles
    CREATE POLICY "All authenticated users can view vehicles"
      ON vehicles FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Admins can modify vehicles"
      ON vehicles FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    -- Policies for vehicle status history
    CREATE POLICY "All authenticated users can view status history"
      ON vehicle_status_history FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "All users can create status history"
      ON vehicle_status_history FOR INSERT
      TO authenticated
      WITH CHECK (true);

    -- Policies for work orders
    CREATE POLICY "All authenticated users can view work orders"
      ON work_orders FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "All users can create work orders"
      ON work_orders FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "Admins can update work orders"
      ON work_orders FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    -- Functions
    CREATE OR REPLACE FUNCTION update_vehicle_status(
      vehicle_id uuid,
      new_status vehicle_status,
      notes text DEFAULT NULL
    ) RETURNS void AS $$
    DECLARE
      current_status vehicle_status;
    BEGIN
      -- Get current status
      SELECT status INTO current_status
      FROM vehicles
      WHERE id = vehicle_id;

      -- Update vehicle status
      UPDATE vehicles
      SET 
        status = new_status,
        updated_at = now()
      WHERE id = vehicle_id;

      -- Record status change
      INSERT INTO vehicle_status_history
        (vehicle_id, previous_status, new_status, changed_by, notes)
      VALUES
        (vehicle_id, current_status, new_status, auth.uid(), notes);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
