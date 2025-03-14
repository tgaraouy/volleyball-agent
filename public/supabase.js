/* global supabase */

console.log('Supabase helpers initialized');

// Helper functions for data operations
window.supabaseHelpers = {
    // Players
    async getPlayers() {
        console.log('Getting players via helper...');
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('last_name');
        if (error) throw error;
        console.log('Players retrieved:', data);
        return data;
    },

    async savePlayer(player) {
        const { data, error } = await supabase
            .from('players')
            .upsert(player)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Tryouts
    async getTryouts() {
        const { data, error } = await supabase
            .from('tryouts')
            .select('*')
            .order('date');
        if (error) throw error;
        return data;
    },

    async saveTryout(tryout) {
        const { data, error } = await supabase
            .from('tryouts')
            .upsert(tryout)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Drills
    async getDrills() {
        const { data, error } = await supabase
            .from('drills')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async saveDrill(drill) {
        const { data, error } = await supabase
            .from('drills')
            .upsert(drill)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Fundraising
    async getFundraisingCampaigns() {
        const { data, error } = await supabase
            .from('fundraising_campaigns')
            .select('*')
            .order('start_date');
        if (error) throw error;
        return data;
    },

    async saveFundraisingCampaign(campaign) {
        const { data, error } = await supabase
            .from('fundraising_campaigns')
            .upsert(campaign)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Parents
    async getParentInterest() {
        const { data, error } = await supabase
            .from('parent_interest')
            .select('*')
            .order('created_at');
        if (error) throw error;
        return data;
    },

    async saveParentInterest(interest) {
        const { data, error } = await supabase
            .from('parent_interest')
            .upsert(interest)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Newsletter
    async getNewsletterSubscriptions() {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .select('*')
            .order('created_at');
        if (error) throw error;
        return data;
    },

    async saveNewsletterSubscription(subscription) {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .upsert(subscription)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// Helper functions for common operations
window.db = {
    // Players
    async getPlayers() {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async savePlayer(player) {
        const { data, error } = await supabase
            .from('players')
            .upsert(player)
            .select();
        if (error) throw error;
        return data[0];
    },

    // Tryouts
    async getTryoutSessions() {
        const { data, error } = await supabase
            .from('tryout_sessions')
            .select('*')
            .order('date');
        if (error) throw error;
        return data;
    },

    async getSessionEvaluations(sessionId) {
        const { data, error } = await supabase
            .from('tryout_evaluations')
            .select('*')
            .eq('session_id', sessionId)
            .order('player_name');
        if (error) throw error;
        return data;
    },

    async saveEvaluation(evaluation) {
        const { data, error } = await supabase
            .from('tryout_evaluations')
            .upsert(evaluation)
            .select();
        if (error) throw error;
        return data[0];
    },

    // Fundraising
    async getCampaigns() {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async saveCampaign(campaign) {
        const { data, error } = await supabase
            .from('campaigns')
            .upsert(campaign)
            .select();
        if (error) throw error;
        return data[0];
    },

    async getDonations(campaignId) {
        const { data, error } = await supabase
            .from('donations')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Parent Interest
    async getParentInterests() {
        const { data, error } = await supabase
            .from('parent_interests')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async saveParentInterest(interest) {
        const { data, error } = await supabase
            .from('parent_interests')
            .upsert(interest)
            .select();
        if (error) throw error;
        return data[0];
    },

    async getVolunteers() {
        const { data, error } = await supabase
            .from('parent_volunteers')
            .select(`
                *,
                parent:parent_interests (
                    parent_name,
                    email,
                    phone
                )
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Drills
    async getDrillsByFocus(focusArea) {
        const { data, error } = await supabase
            .from('drills')
            .select('*')
            .contains('focus_area', [focusArea])
            .eq('active', true)
            .order('name');
        if (error) throw error;
        return data;
    },

    async getDrillsByDifficulty(level) {
        const { data, error } = await supabase
            .from('drills')
            .select('*')
            .eq('difficulty_level', level)
            .eq('active', true)
            .order('name');
        if (error) throw error;
        return data;
    },

    // Newsletter Subscriptions
    async getNewsletterSubscriptions() {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async saveNewsletterSubscription(subscription) {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .upsert(subscription)
            .select();
        if (error) throw error;
        return data[0];
    },

    async updateSubscriptionStatus(id, status) {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .update({ status })
            .eq('id', id)
            .select();
        if (error) throw error;
        return data[0];
    },

    async getActiveSubscriptionsByType(type) {
        const { data, error } = await supabase
            .from('newsletter_subscriptions')
            .select('*')
            .contains('subscription_type', [type])
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
}; 