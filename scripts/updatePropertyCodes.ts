
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePropertyCodes() {
  console.log('Fetching properties without codes...');
  
  // Fetch all properties to check which ones need updating
  // We'll update ALL properties to ensure consistency, or filter for those with empty codes
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, property_code, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  console.log(`Found ${properties.length} properties.`);

  let updatedCount = 0;
  
  // We will assign codes like Horus001, Horus002 based on created_at order
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const newCode = `Horus${String(i + 1).padStart(3, '0')}`;
    
    // Only update if code is missing or we want to re-standardize everything
    // Let's prioritize filling missing ones, but the user said "I want ALL properties with a code"
    // So if it already has a code, we might leave it, or if it's empty/null, we assign one.
    // However, to ensure uniqueness without conflict, a full re-generation might be safer 
    // IF we are sure we won't break external references. 
    // PROPOSAL: Only update if property_code is null or empty string.
    
    if (!property.property_code || property.property_code.trim() === '') {
        console.log(`Updating property ${property.id} with code ${newCode}`);
        
        const { error: updateError } = await supabase
            .from('properties')
            .update({ property_code: newCode })
            .eq('id', property.id);
            
        if (updateError) {
            console.error(`Failed to update property ${property.id}:`, updateError);
        } else {
            updatedCount++;
        }
    }
  }

  console.log(`Update complete. Assigned codes to ${updatedCount} properties.`);
}

updatePropertyCodes();
