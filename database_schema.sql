-- Aaniry VMS Database Schema
-- PostgreSQL 16+
-- Version: 1.0
-- Date: 2026-02-05

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'customer', 'vendor')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    pan VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_gstin ON customers(gstin);
CREATE INDEX idx_customers_status ON customers(status);

-- ============================================================================
-- VENDORS
-- ============================================================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    pan VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendors_customer ON vendors(customer_id);
CREATE INDEX idx_vendors_gstin ON vendors(gstin);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_code ON vendors(vendor_code);

-- ============================================================================
-- VENDOR CAPABILITIES
-- ============================================================================

CREATE TABLE vendor_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    process_name VARCHAR(100) NOT NULL,
    process_type VARCHAR(50) CHECK (process_type IN ('turning', 'milling', 'grinding', 'drilling', 'boring', 'broaching', 'heat_treatment', 'coating', 'inspection', 'assembly', 'other')),
    machine_type VARCHAR(100),
    machine_count INTEGER DEFAULT 1,
    capacity_per_day INTEGER,
    capacity_per_month INTEGER,
    setup_time_hours DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_capabilities_vendor ON vendor_capabilities(vendor_id);
CREATE INDEX idx_vendor_capabilities_process ON vendor_capabilities(process_type);

-- ============================================================================
-- DELIVERY CHALLANS
-- ============================================================================

CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
    challan_date DATE NOT NULL,
    expected_return_date DATE,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    driver_license VARCHAR(50),
    transport_company VARCHAR(255),
    freight_charges DECIMAL(10,2),
    total_quantity INTEGER NOT NULL,
    total_weight DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'in_process', 'partially_completed', 'completed', 'closed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    remarks TEXT,
    internal_notes TEXT,
    pdf_url TEXT,
    created_by UUID REFERENCES users(id),
    issued_at TIMESTAMP,
    completed_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_challans_number ON delivery_challans(challan_number);
CREATE INDEX idx_challans_customer ON delivery_challans(customer_id);
CREATE INDEX idx_challans_vendor ON delivery_challans(vendor_id);
CREATE INDEX idx_challans_status ON delivery_challans(status);
CREATE INDEX idx_challans_date ON delivery_challans(challan_date);
CREATE INDEX idx_challans_priority ON delivery_challans(priority);

-- ============================================================================
-- CHALLAN ITEMS
-- ============================================================================

CREATE TABLE challan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_id UUID REFERENCES delivery_challans(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    part_description TEXT,
    quantity_issued INTEGER NOT NULL CHECK (quantity_issued > 0),
    quantity_received INTEGER DEFAULT 0,
    quantity_accepted INTEGER DEFAULT 0,
    quantity_rejected INTEGER DEFAULT 0,
    unit_of_measure VARCHAR(20) DEFAULT 'NOS',
    material_grade VARCHAR(50),
    material_specification TEXT,
    drawing_reference VARCHAR(100),
    drawing_revision VARCHAR(20),
    heat_number VARCHAR(100),
    batch_number VARCHAR(100),
    weight_per_piece DECIMAL(10,4),
    unit_rate DECIMAL(10,2),
    total_value DECIMAL(15,2),
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'in_process', 'completed', 'short_closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_challan_items_challan ON challan_items(challan_id);
CREATE INDEX idx_challan_items_part ON challan_items(part_number);
CREATE INDEX idx_challan_items_status ON challan_items(status);

-- ============================================================================
-- JOB PROCESS DEFINITIONS
-- ============================================================================

CREATE TABLE job_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_item_id UUID REFERENCES challan_items(id) ON DELETE CASCADE,
    process_sequence INTEGER NOT NULL CHECK (process_sequence > 0),
    process_name VARCHAR(100) NOT NULL,
    process_type VARCHAR(50) CHECK (process_type IN ('turning', 'milling', 'grinding', 'drilling', 'boring', 'broaching', 'heat_treatment', 'coating', 'inspection', 'assembly', 'packaging', 'other')),
    machine_required VARCHAR(100),
    estimated_hours DECIMAL(10,2),
    target_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    rework_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
    hold_reason TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(challan_item_id, process_sequence)
);

CREATE INDEX idx_job_processes_item ON job_processes(challan_item_id);
CREATE INDEX idx_job_processes_status ON job_processes(status);
CREATE INDEX idx_job_processes_sequence ON job_processes(challan_item_id, process_sequence);

-- ============================================================================
-- PROCESS UPDATE LOGS
-- ============================================================================

CREATE TABLE process_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_process_id UUID REFERENCES job_processes(id) ON DELETE CASCADE,
    quantity_completed INTEGER NOT NULL,
    quantity_rejected INTEGER DEFAULT 0,
    quantity_rework INTEGER DEFAULT 0,
    rejection_reason TEXT,
    rework_reason TEXT,
    operator_name VARCHAR(100),
    machine_used VARCHAR(100),
    shift VARCHAR(20),
    remarks TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_process_updates_job ON process_updates(job_process_id);
CREATE INDEX idx_process_updates_date ON process_updates(created_at);

-- ============================================================================
-- QUALITY REJECTIONS
-- ============================================================================

CREATE TABLE quality_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_item_id UUID REFERENCES challan_items(id) ON DELETE CASCADE,
    job_process_id UUID REFERENCES job_processes(id) ON DELETE SET NULL,
    rejection_type VARCHAR(50) CHECK (rejection_type IN ('dimensional', 'surface_finish', 'material_defect', 'machining_defect', 'heat_treatment', 'coating', 'other')),
    quantity_rejected INTEGER NOT NULL,
    defect_description TEXT NOT NULL,
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    disposition VARCHAR(50) CHECK (disposition IN ('scrap', 'rework', 'use_as_is', 'return_to_vendor', 'pending')),
    rejected_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rejections_item ON quality_rejections(challan_item_id);
CREATE INDEX idx_rejections_process ON quality_rejections(job_process_id);
CREATE INDEX idx_rejections_type ON quality_rejections(rejection_type);

-- ============================================================================
-- DISPATCH PLANNING
-- ============================================================================

CREATE TABLE dispatch_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
    planned_date DATE NOT NULL,
    actual_dispatch_date DATE,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    transport_company VARCHAR(255),
    freight_charges DECIMAL(10,2),
    total_quantity INTEGER DEFAULT 0,
    total_trays INTEGER DEFAULT 0,
    total_weight DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'in_transit', 'delivered', 'cancelled')),
    notes TEXT,
    delivery_proof_url TEXT,
    created_by UUID REFERENCES users(id),
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dispatch_plans_number ON dispatch_plans(dispatch_number);
CREATE INDEX idx_dispatch_plans_customer ON dispatch_plans(customer_id);
CREATE INDEX idx_dispatch_plans_vendor ON dispatch_plans(vendor_id);
CREATE INDEX idx_dispatch_plans_status ON dispatch_plans(status);
CREATE INDEX idx_dispatch_plans_date ON dispatch_plans(planned_date);

-- ============================================================================
-- DISPATCH ITEMS
-- ============================================================================

CREATE TABLE dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_plan_id UUID REFERENCES dispatch_plans(id) ON DELETE CASCADE,
    challan_item_id UUID REFERENCES challan_items(id) ON DELETE RESTRICT,
    quantity_dispatched INTEGER NOT NULL CHECK (quantity_dispatched > 0),
    trays_used INTEGER DEFAULT 0,
    weight DECIMAL(10,2),
    packing_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dispatch_items_plan ON dispatch_items(dispatch_plan_id);
CREATE INDEX idx_dispatch_items_challan ON dispatch_items(challan_item_id);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_type VARCHAR(50) DEFAULT 'tax_invoice' CHECK (invoice_type IN ('tax_invoice', 'job_work_invoice', 'debit_note', 'credit_note')),
    vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    po_number VARCHAR(100),
    po_date DATE,
    
    -- Amount breakdown
    subtotal DECIMAL(15,2) NOT NULL,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    tcs_rate DECIMAL(5,2) DEFAULT 0,
    tcs_amount DECIMAL(15,2) DEFAULT 0,
    round_off DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(15,2) NOT NULL,
    
    -- Payment details
    payment_terms TEXT,
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    branch VARCHAR(255),
    
    -- Status and tracking
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    remarks TEXT,
    internal_notes TEXT,
    invoice_pdf_url TEXT,
    e_invoice_number VARCHAR(100),
    e_invoice_date DATE,
    e_invoice_irn VARCHAR(255),
    
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================================
-- INVOICE LINE ITEMS
-- ============================================================================

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    challan_id UUID REFERENCES delivery_challans(id) ON DELETE SET NULL,
    challan_item_id UUID REFERENCES challan_items(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    part_number VARCHAR(100),
    hsn_sac_code VARCHAR(20),
    quantity INTEGER NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'NOS',
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    taxable_amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_challan ON invoice_items(challan_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_mode VARCHAR(50) CHECK (payment_mode IN ('cash', 'cheque', 'neft', 'rtgs', 'upi', 'card', 'other')),
    transaction_reference VARCHAR(255),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(255),
    notes TEXT,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'bounced')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'vendor', 'challan', 'invoice', 'dispatch', 'process', 'other')),
    entity_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('pdf', 'image', 'drawing', 'certificate', 'report', 'other')),
    category VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('challan_issued', 'process_updated', 'dispatch_planned', 'invoice_generated', 'payment_received', 'system_alert', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_date ON notifications(created_at);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    value_type VARCHAR(50) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON system_settings(setting_key);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challans_updated_at BEFORE UPDATE ON delivery_challans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challan_items_updated_at BEFORE UPDATE ON challan_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_processes_updated_at BEFORE UPDATE ON job_processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dispatch_plans_updated_at BEFORE UPDATE ON dispatch_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate available quantity for next process
CREATE OR REPLACE FUNCTION calculate_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_quantity := NEW.target_quantity - NEW.completed_quantity - NEW.rejected_quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_job_process_available BEFORE INSERT OR UPDATE ON job_processes FOR EACH ROW EXECUTE FUNCTION calculate_available_quantity();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Vendor Performance Summary
CREATE OR REPLACE VIEW vendor_performance_summary AS
SELECT 
    v.id AS vendor_id,
    v.company_name AS vendor_name,
    COUNT(DISTINCT dc.id) AS total_challans,
    SUM(ci.quantity_issued) AS total_quantity_issued,
    SUM(ci.quantity_accepted) AS total_quantity_accepted,
    SUM(ci.quantity_rejected) AS total_quantity_rejected,
    ROUND(AVG(EXTRACT(EPOCH FROM (dc.completed_at - dc.issued_at)) / 86400), 2) AS avg_turnaround_days,
    ROUND((SUM(ci.quantity_rejected)::DECIMAL / NULLIF(SUM(ci.quantity_issued), 0)) * 100, 2) AS rejection_rate_percent
FROM vendors v
LEFT JOIN delivery_challans dc ON v.id = dc.vendor_id
LEFT JOIN challan_items ci ON dc.id = ci.challan_id
WHERE dc.status IN ('completed', 'closed')
GROUP BY v.id, v.company_name;

-- Job Aging Report
CREATE OR REPLACE VIEW job_aging_report AS
SELECT 
    dc.challan_number,
    dc.challan_date,
    v.company_name AS vendor_name,
    ci.part_number,
    ci.quantity_issued,
    ci.quantity_accepted,
    ci.status,
    CURRENT_DATE - dc.challan_date AS aging_days,
    CASE 
        WHEN CURRENT_DATE - dc.challan_date < 7 THEN 'Less than 7 days'
        WHEN CURRENT_DATE - dc.challan_date BETWEEN 7 AND 14 THEN '7-14 days'
        WHEN CURRENT_DATE - dc.challan_date BETWEEN 15 AND 30 THEN '15-30 days'
        ELSE 'More than 30 days'
    END AS aging_bucket
FROM delivery_challans dc
JOIN vendors v ON dc.vendor_id = v.id
JOIN challan_items ci ON dc.id = ci.challan_id
WHERE dc.status NOT IN ('completed', 'closed', 'cancelled');

-- Short Supply Register
CREATE OR REPLACE VIEW short_supply_register AS
SELECT 
    dc.challan_number,
    dc.challan_date,
    v.company_name AS vendor_name,
    ci.part_number,
    ci.part_description,
    ci.quantity_issued,
    ci.quantity_accepted,
    ci.quantity_rejected,
    (ci.quantity_issued - ci.quantity_accepted - ci.quantity_rejected) AS balance_quantity,
    ci.status
FROM delivery_challans dc
JOIN vendors v ON dc.vendor_id = v.id
JOIN challan_items ci ON dc.id = ci.challan_id
WHERE (ci.quantity_issued - ci.quantity_accepted - ci.quantity_rejected) > 0
AND ci.status != 'short_closed';

-- Invoice Aging Report
CREATE OR REPLACE VIEW invoice_aging_report AS
SELECT 
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    v.company_name AS vendor_name,
    i.grand_total,
    i.paid_amount,
    (i.grand_total - i.paid_amount) AS outstanding_amount,
    CASE 
        WHEN i.due_date IS NULL THEN NULL
        ELSE CURRENT_DATE - i.due_date
    END AS days_overdue,
    i.payment_status,
    i.status
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
WHERE i.payment_status != 'paid';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default admin user (password: Admin@123)
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_email_verified)
VALUES ('admin@aaniry.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5L4C/M3BrZnqC', 'admin', 'System', 'Admin', true, true);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, value_type, description, is_public) VALUES
('company_name', 'Aaniry Overseas Pvt. Ltd.', 'string', 'Company name for documents', true),
('company_gstin', '27AAAAA0000A1Z5', 'string', 'Company GSTIN', false),
('company_address', 'Pune, Maharashtra, India', 'string', 'Company address', true),
('default_gst_rate', '18', 'number', 'Default GST rate percentage', true),
('challan_prefix', 'DC', 'string', 'Delivery challan number prefix', true),
('invoice_prefix', 'INV', 'string', 'Invoice number prefix', true),
('dispatch_prefix', 'DISP', 'string', 'Dispatch number prefix', true),
('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications', true),
('whatsapp_notifications_enabled', 'false', 'boolean', 'Enable WhatsApp notifications', true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'System users - admin, customer users, and vendor users';
COMMENT ON TABLE customers IS 'Customer organizations (OEMs) who issue work to vendors';
COMMENT ON TABLE vendors IS 'Machining vendors who receive job work';
COMMENT ON TABLE delivery_challans IS 'Material delivery challans issued to vendors';
COMMENT ON TABLE challan_items IS 'Individual parts/items in each challan';
COMMENT ON TABLE job_processes IS 'Process-wise job tracking for each challan item';
COMMENT ON TABLE process_updates IS 'Historical log of process updates';
COMMENT ON TABLE dispatch_plans IS 'Planned dispatches from vendors to customers';
COMMENT ON TABLE invoices IS 'Vendor invoices for completed work';
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical operations';
