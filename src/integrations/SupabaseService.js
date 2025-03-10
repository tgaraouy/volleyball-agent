// src/integrations/SupabaseService.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class SupabaseService {
  constructor() {
    // Using environment variables for credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are missing from environment variables');
    }
    
    // Initialize Supabase client
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Setup proper security and error handling
    this.setupErrorHandling();
  }
  
  setupErrorHandling() {
    // Global error handler to prevent sensitive error information leakage
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Handle auth issues
        console.warn('Authentication state changed:', event);
      }
    });
  }
  
  // Secure database operations with proper error handling, validation and sanitization
  
  async getPlayer(playerId) {
    // Validate ID before querying
    if (!this.isValidUUID(playerId)) {
      throw new Error('Invalid player ID format');
    }
    
    const { data, error } = await this.supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
      
    if (error) {
      this.logError('getPlayer', error, { playerId });
      throw new Error(`Database error: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return data;
  }
  
  async updatePlayer(playerId, updates) {
    // Validate ID and sanitize updates
    if (!this.isValidUUID(playerId)) {
      throw new Error('Invalid player ID format');
    }
    
    // Remove any potentially harmful fields
    const sanitizedUpdates = this.sanitizeObject(updates);
    
    const { data, error } = await this.supabase
      .from('players')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date()
      })
      .eq('id', playerId);
      
    if (error) {
      this.logError('updatePlayer', error, { playerId });
      throw new Error(`Database error: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return data;
  }
  
  async getProgramState() {
    console.log('Attempting to get program state...');
    const { data, error } = await this.supabase
      .from('program_state')
      .select('*')
      .eq('id', 1)
      .single();
      
    if (error) {
      this.logError('getProgramState', error);
      throw new Error(`Database error: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    // Convert snake_case to camelCase for the model
    if (data) {
      console.log('Found existing program state:', data);
      return {
        currentSeasonYear: data.current_season_year,
        currentPhase: data.current_phase,
        nextImportantDate: data.next_important_date ? new Date(data.next_important_date) : null,
        nextImportantEvent: data.next_important_event,
        lastUpdated: data.last_updated ? new Date(data.last_updated) : new Date()
      };
    }
    
    console.log('No program state found');
    return null;
  }
  
  async saveProgramState(programState) {
    console.log('Saving program state:', programState);
    // Convert camelCase to snake_case for the database
    const dbState = {
      id: 1, // Always use id = 1 as per table constraint
      current_season_year: programState.currentSeasonYear,
      current_phase: programState.currentPhase,
      next_important_date: programState.nextImportantDate ? programState.nextImportantDate.toISOString() : null,
      next_important_event: programState.nextImportantEvent,
      last_updated: new Date().toISOString()
    };
    
    console.log('Converted state for database:', dbState);
    
    // Sanitize the program state data
    const sanitizedState = this.sanitizeObject(dbState);
    console.log('Sanitized state:', sanitizedState);
    
    try {
      const { data, error } = await this.supabase
        .from('program_state')
        .upsert(sanitizedState)
        .select()
        .single();
        
      if (error) {
        this.logError('saveProgramState', error);
        throw new Error(`Database error: ${this.sanitizeErrorMessage(error.message)}`);
      }
      
      console.log('Successfully saved program state:', data);
      return data;
    } catch (error) {
      console.error('Error in saveProgramState:', error);
      throw error;
    }
  }
  
  async createPlayer(playerData) {
    const { data, error } = await this.supabase
      .from('players')
      .insert([{
        first_name: playerData.firstName,
        last_name: playerData.lastName,
        grade: playerData.grade,
        school_level: playerData.schoolLevel,
        position: playerData.position
      }])
      .select('id')
      .single();
      
    if (error) {
      this.logError('createPlayer', error);
      throw new Error(`Failed to create player: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return data.id;
  }

  async addParentToPlayer(playerId, parentInfo) {
    // First, create or get the parent
    let parentId;
    
    // Check if parent exists by email
    const { data: existingParent } = await this.supabase
      .from('parents')
      .select('id')
      .eq('email', parentInfo.email)
      .maybeSingle();
      
    if (existingParent) {
      parentId = existingParent.id;
    } else {
      // Create new parent
      const { data: newParent, error } = await this.supabase
        .from('parents')
        .insert([{
          first_name: parentInfo.firstName,
          last_name: parentInfo.lastName,
          email: parentInfo.email,
          phone: parentInfo.phone,
          preferred_contact_method: parentInfo.preferredContactMethod || 'email'
        }])
        .select('id')
        .single();
        
      if (error) {
        this.logError('createParent', error);
        throw new Error(`Failed to create parent: ${this.sanitizeErrorMessage(error.message)}`);
      }
      
      parentId = newParent.id;
    }
    
    // Now link parent to player
    const { error } = await this.supabase
      .from('player_parents')
      .insert([{
        player_id: playerId,
        parent_id: parentId,
        relationship: parentInfo.relationship || 'parent',
        is_primary_contact: parentInfo.isPrimaryContact || true
      }]);
      
    if (error) {
      this.logError('linkParentToPlayer', error);
      throw new Error(`Failed to link parent to player: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return parentId;
  }
  
  // Security utility methods
  
  isValidUUID(uuid) {
    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  sanitizeObject(obj) {
    // Deep clone and sanitize all string values
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  sanitizeString(str) {
    // Basic string sanitization to prevent XSS
    return str.replace(/[<>]/g, '');
  }
  
  sanitizeErrorMessage(message) {
    // Ensure error messages don't leak sensitive information
    // Remove any potential connection strings, credentials, etc.
    return message.replace(/(connection|password|secret|key|token)=\S+/gi, '$1=REDACTED');
  }
  
  logError(method, error, context = {}) {
    // Secure error logging that doesn't expose sensitive information
    console.error({
      timestamp: new Date().toISOString(),
      service: 'SupabaseService',
      method,
      errorType: error.code || 'UNKNOWN',
      message: this.sanitizeErrorMessage(error.message),
      context: this.sanitizeObject(context)
    });
  }

  async recordPlayerMetric(playerId, metricId, value, recordedBy) {
    // Validate IDs
    if (!this.isValidUUID(playerId)) {
      throw new Error('Invalid player ID format');
    }
    if (!this.isValidUUID(metricId)) {
      throw new Error('Invalid metric ID format');
    }
    
    const { data, error } = await this.supabase
      .from('player_metrics')
      .insert([{
        player_id: playerId,
        metric_id: metricId,
        value: value,
        recorded_by: recordedBy,
        recorded_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      this.logError('recordPlayerMetric', error);
      throw new Error(`Failed to record metric: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return data;
  }

  async getPlayerMetrics(playerId, options = {}) {
    if (!this.isValidUUID(playerId)) {
      throw new Error('Invalid player ID format');
    }

    let query = this.supabase
      .from('player_metrics')
      .select(`
        *,
        metrics (
          name,
          category,
          unit,
          target_direction
        )
      `)
      .eq('player_id', playerId);

    // Add optional filters
    if (options.startDate) {
      query = query.gte('recorded_at', options.startDate.toISOString());
    }
    if (options.endDate) {
      query = query.lte('recorded_at', options.endDate.toISOString());
    }
    if (options.category) {
      query = query.eq('metrics.category', options.category);
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      this.logError('getPlayerMetrics', error);
      throw new Error(`Failed to get player metrics: ${this.sanitizeErrorMessage(error.message)}`);
    }

    return data;
  }

  async getMetricDefinitions(category = null) {
    let query = this.supabase
      .from('metrics')
      .select('*');
      
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      this.logError('getMetricDefinitions', error);
      throw new Error(`Failed to get metric definitions: ${this.sanitizeErrorMessage(error.message)}`);
    }
    
    return data;
  }

  async createEvent(eventData) {
    const sanitizedData = this.sanitizeObject({
      title: eventData.title,
      type: eventData.type,
      start_time: eventData.start_time?.toISOString() || eventData.startTime?.toISOString(),
      end_time: eventData.end_time?.toISOString() || eventData.endTime?.toISOString(),
      location: eventData.location,
      description: eventData.description
    });

    const { data, error } = await this.supabase
      .from('events')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      this.logError('createEvent', error);
      throw new Error(`Failed to create event: ${this.sanitizeErrorMessage(error.message)}`);
    }

    return data;
  }

  async updateEvent(eventId, updates) {
    if (!this.isValidUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }

    const sanitizedUpdates = this.sanitizeObject({
      ...updates,
      start_time: updates.startTime?.toISOString(),
      end_time: updates.endTime?.toISOString(),
      updated_at: new Date().toISOString()
    });

    const { data, error } = await this.supabase
      .from('events')
      .update(sanitizedUpdates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      this.logError('updateEvent', error);
      throw new Error(`Failed to update event: ${this.sanitizeErrorMessage(error.message)}`);
    }

    return data;
  }

  async getEvent(eventId) {
    if (!this.isValidUUID(eventId)) {
      throw new Error('Invalid event ID format');
    }

    const { data, error } = await this.supabase
      .from('events')
      .select(`
        *,
        games (
          id,
          team:teams (
            id,
            name
          )
        ),
        practice_plans (
          id,
          focus_areas,
          warm_up,
          main_activities,
          cool_down,
          notes,
          team:teams (
            id,
            name
          )
        )
      `)
      .eq('id', eventId)
      .single();

    if (error) {
      this.logError('getEvent', error);
      throw new Error(`Failed to get event: ${this.sanitizeErrorMessage(error.message)}`);
    }

    return data;
  }

  async getUpcomingEvents(options = {}) {
    console.log('Starting getUpcomingEvents with options:', options);
    
    try {
      let query = this.supabase
        .from('events')
        .select(`
          *,
          games (
            id,
            team:teams (
              id,
              name
            )
          ),
          practice_plans (
            id,
            focus_areas,
            warm_up,
            main_activities,
            cool_down,
            notes,
            team:teams (
              id,
              name
            )
          )
        `)
        .gte('start_time', new Date().toISOString());

      if (options.teamLevel) {
        query = query.eq('team_level', options.teamLevel);
      }
      if (options.type) {
        query = query.eq('type', options.type);
      }
      if (options.daysAhead) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.daysAhead);
        query = query.lte('start_time', futureDate.toISOString());
      }

      query = query.order('start_time', { ascending: true });
      console.log('Query built:', query);

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error in getUpcomingEvents:', error);
        this.logError('getUpcomingEvents', error);
        throw new Error(`Failed to get upcoming events: ${this.sanitizeErrorMessage(error.message)}`);
      }

      console.log('Successfully retrieved events, count:', data?.length);
      return data || [];
    } catch (error) {
      console.error('Unexpected error in getUpcomingEvents:', error);
      this.logError('getUpcomingEvents', error);
      throw new Error(`Failed to get upcoming events: ${this.sanitizeErrorMessage(error.message)}`);
    }
  }

  async recordEventAttendance(eventId, playerId, status, notes = '') {
    throw new Error('Event attendance feature is not available');
  }

  async getPlayerAttendance(playerId, options = {}) {
    throw new Error('Event attendance feature is not available');
  }

  async createFundraisingCampaign(campaignData) {
    console.log('Received campaign data in SupabaseService:', campaignData);

    // Ensure dates are properly formatted
    const start_date = campaignData.start_date instanceof Date 
      ? campaignData.start_date.toISOString()
      : new Date(campaignData.start_date).toISOString();
      
    const end_date = campaignData.end_date instanceof Date
      ? campaignData.end_date.toISOString()
      : new Date(campaignData.end_date).toISOString();

    if (!start_date || !end_date || isNaN(new Date(start_date)) || isNaN(new Date(end_date))) {
      throw new Error('Valid start_date and end_date are required');
    }

    const sanitizedData = this.sanitizeObject({
      name: campaignData.name,
      description: campaignData.description,
      goal_amount: campaignData.goal_amount,
      current_amount: campaignData.current_amount || 0,
      start_date,
      end_date,
      status: campaignData.status || 'planning',
      coordinator_id: campaignData.coordinator_id
    });

    const { data, error } = await this.supabase
      .from('fundraising_campaigns')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      this.logError('createFundraisingCampaign', error);
      throw new Error(`Failed to create fundraising campaign: ${this.sanitizeErrorMessage(error.message)}`);
    }

    return data;
  }
}

module.exports = SupabaseService;