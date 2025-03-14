import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = 'https://taygbewanmzrdspnidxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWdiZXdhbm16cmRzcG5pZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NTc3ODEsImV4cCI6MjA1NzEzMzc4MX0.WUpR6n12W-6AmgQLSmGW07E2FSwBoE5QJwYiZ8N-NMw';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split the schema into individual statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Execute each statement
        for (const statement of statements) {
            const { error } = await supabase.rpc('exec', { sql: statement });
            if (error) {
                console.error('Error executing statement:', statement);
                console.error('Error details:', error);
            }
        }

        console.log('Database setup completed successfully');
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase(); 