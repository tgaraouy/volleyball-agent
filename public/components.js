/* global Vue, supabase */

// Simple test component to verify Vue is working
Vue.component('test-component', {
    data() {
        return {
            message: 'This is a test component',
            count: 0
        };
    },
    template: `
        <div class="card p-3 mb-3">
            <h4>{{ message }}</h4>
            <p>Count: {{ count }}</p>
            <button class="btn btn-primary" @click="count++">Increment</button>
        </div>
    `
});

// Player Management Components
Vue.component('player-roster', {
    data() {
        console.log('Player roster component data() called');
        return {
            players: [],
            loading: true,
            error: null,
            showAddModal: false,
            newPlayer: {
                first_name: '',
                last_name: '',
                grade: '',
                school_level: 'high',
                position: '',
                jersey_number: null,
                height_cm: null,
                vertical_jump_cm: null,
                email: '',
                phone: '',
                emergency_contact: '',
                emergency_phone: '',
                medical_info: ''
            },
            positions: [
                'Outside Hitter',
                'Middle Blocker',
                'Setter',
                'Libero',
                'Defensive Specialist',
                'Opposite Hitter'
            ],
            grades: [6, 7, 8, 9, 10, 11, 12]
        };
    },
    template: `
        <div class="container py-4">
            <div class="debug-info" style="margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>Debug Info:</strong><br>
                Loading: {{ loading }}<br>
                Error: {{ error }}<br>
                Players Count: {{ players.length }}<br>
            </div>
            <h2>Player Roster</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Add Player</button>
                </div>
                <div v-if="players.length === 0" class="alert alert-info">
                    No players found. Click "Add Player" to add your first player.
                </div>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Grade</th>
                                <th>Position</th>
                                <th>#</th>
                                <th>Height</th>
                                <th>Vertical</th>
                                <th>Contact</th>
                                <th>Emergency Contact</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="player in players" :key="player.id">
                                <td>{{ player.first_name }} {{ player.last_name }}</td>
                                <td>{{ player.grade }} ({{ player.school_level }})</td>
                                <td>{{ player.position }}</td>
                                <td>{{ player.jersey_number }}</td>
                                <td>{{ player.height_cm ? player.height_cm + ' cm' : '-' }}</td>
                                <td>{{ player.vertical_jump_cm ? player.vertical_jump_cm + ' cm' : '-' }}</td>
                                <td>
                                    <small>
                                        <div>{{ player.email }}</div>
                                        <div>{{ player.phone }}</div>
                                    </small>
                                </td>
                                <td>
                                    <small>
                                        <div>{{ player.emergency_contact }}</div>
                                        <div>{{ player.emergency_phone }}</div>
                                    </small>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-info me-2" @click="viewPlayer(player)">View</button>
                                    <button class="btn btn-sm btn-warning" @click="editPlayer(player)">Edit</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add/Edit Player Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newPlayer.id ? 'Edit' : 'Add' }} Player</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="savePlayer">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">First Name</label>
                                        <input type="text" class="form-control" v-model="newPlayer.first_name" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Last Name</label>
                                        <input type="text" class="form-control" v-model="newPlayer.last_name" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Grade</label>
                                        <select class="form-select" v-model="newPlayer.grade" required>
                                            <option value="">Select Grade</option>
                                            <option v-for="grade in grades" :value="grade">Grade {{ grade }}</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">School Level</label>
                                        <select class="form-select" v-model="newPlayer.school_level" required>
                                            <option value="middle">Middle School</option>
                                            <option value="high">High School</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Jersey Number</label>
                                        <input type="number" class="form-control" v-model="newPlayer.jersey_number">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Position</label>
                                        <select class="form-select" v-model="newPlayer.position">
                                            <option value="">Select Position</option>
                                            <option v-for="pos in positions" :value="pos">{{ pos }}</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Height (cm)</label>
                                        <input type="number" class="form-control" v-model="newPlayer.height_cm">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Vertical Jump (cm)</label>
                                        <input type="number" class="form-control" v-model="newPlayer.vertical_jump_cm">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" v-model="newPlayer.email">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" v-model="newPlayer.phone">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Emergency Contact</label>
                                        <input type="text" class="form-control" v-model="newPlayer.emergency_contact">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Emergency Phone</label>
                                        <input type="tel" class="form-control" v-model="newPlayer.emergency_phone">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Medical Information</label>
                                    <textarea class="form-control" v-model="newPlayer.medical_info" rows="3"></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save Player</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchPlayers() {
            console.log('fetchPlayers method called');
            try {
                console.log('Fetching players from Supabase...');
                const { data, error } = await supabase
                    .from('players')
                    .select('*')
                    .order('last_name');
                
                console.log('Supabase response:', { data, error });
                
                if (error) {
                    throw error;
                }
                
                if (!data) {
                    // Check if the table exists
                    console.log('No data returned, checking if table exists...');
                    this.players = [];
                    this.error = 'No players found. The players table might not exist.';
                } else {
                    this.players = data;
                    console.log('Players stored in component:', this.players);
                }
                this.loading = false;
            } catch (err) {
                console.error('Error in fetchPlayers:', err);
                this.error = 'Failed to load players: ' + err.message;
                this.loading = false;
            }
        },
        async savePlayer() {
            try {
                const { data, error } = await supabase
                    .from('players')
                    .upsert(this.newPlayer)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newPlayer = {
                    first_name: '',
                    last_name: '',
                    grade: '',
                    school_level: 'high',
                    position: '',
                    jersey_number: null,
                    height_cm: null,
                    vertical_jump_cm: null,
                    email: '',
                    phone: '',
                    emergency_contact: '',
                    emergency_phone: '',
                    medical_info: ''
                };
                // Refresh player list
                await this.fetchPlayers();
            } catch (err) {
                console.error('Error saving player:', err);
                this.error = 'Failed to save player';
            }
        },
        viewPlayer(player) {
            // TODO: Implement view player details
            console.log('Viewing player:', player);
        },
        editPlayer(player) {
            this.newPlayer = { ...player };
            this.showAddModal = true;
        }
    },
    mounted() {
        console.log('Player roster component mounted');
        this.fetchPlayers();
    },
    created() {
        console.log('Player roster component created');
    }
});

Vue.component('player-development', {
    data() {
        return {
            developmentPlans: [],
            loading: true,
            error: null,
            showAddModal: false,
            showProgressModal: false,
            selectedPlan: null,
            newPlan: {
                player_id: '',
                focus_area: '',
                description: '',
                progress: 0,
                notes: ''
            },
            players: [],
            focusAreas: [
                'Serving Technique',
                'Setting Accuracy',
                'Hitting Power',
                'Blocking Timing',
                'Defense Positioning',
                'Team Communication'
            ]
        }
    },
    template: `
        <div class="container py-4">
            <h2>Player Development Plans</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Add Development Plan</button>
                </div>
                <div class="row">
                    <div v-for="plan in developmentPlans" :key="plan.id" class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">{{ getPlayerName(plan.player_id) }}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">{{ plan.focus_area }}</h6>
                                <p class="card-text">{{ plan.description }}</p>
                                <div class="progress mb-3">
                                    <div class="progress-bar" role="progressbar" :style="{ width: plan.progress + '%' }">
                                        {{ plan.progress }}%
                                    </div>
                                </div>
                                <div v-if="plan.notes" class="mb-3">
                                    <strong>Notes:</strong>
                                    <p class="mb-0">{{ plan.notes }}</p>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-warning" @click="editPlan(plan)">Edit</button>
                                    <button class="btn btn-primary" @click="updateProgress(plan)">Update Progress</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Plan Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newPlan.id ? 'Edit' : 'Add' }} Development Plan</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="savePlan">
                                <div class="mb-3">
                                    <label class="form-label">Player</label>
                                    <select class="form-select" v-model="newPlan.player_id" required>
                                        <option value="">Select Player</option>
                                        <option v-for="player in players" :key="player.id" :value="player.id">
                                            {{ player.first_name }} {{ player.last_name }}
                                        </option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Focus Area</label>
                                    <select class="form-select" v-model="newPlan.focus_area" required>
                                        <option value="">Select Focus Area</option>
                                        <option v-for="area in focusAreas" :key="area" :value="area">
                                            {{ area }}
                                        </option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" v-model="newPlan.description" rows="3" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Progress (%)</label>
                                    <input type="number" class="form-control" v-model="newPlan.progress" min="0" max="100" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" v-model="newPlan.notes" rows="3"></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Update Progress Modal -->
            <div class="modal fade" :class="{ show: showProgressModal }" tabindex="-1" v-if="showProgressModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Update Progress</h5>
                            <button type="button" class="btn-close" @click="showProgressModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="saveProgress">
                                <div class="mb-3">
                                    <label class="form-label">Progress (%)</label>
                                    <input type="number" class="form-control" v-model="selectedPlan.progress" min="0" max="100" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" v-model="selectedPlan.notes" rows="3"></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showProgressModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save Progress</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchPlayers() {
            try {
                const { data, error } = await supabase
                    .from('players')
                    .select('*')
                    .order('first_name');
                
                if (error) throw error;
                this.players = data;
            } catch (err) {
                console.error('Error fetching players:', err);
                this.error = 'Failed to load players';
            }
        },
        async fetchDevelopmentPlans() {
            try {
                const { data, error } = await supabase
                    .from('development_plans')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                this.developmentPlans = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching development plans:', err);
                this.error = 'Failed to load development plans';
                this.loading = false;
            }
        },
        async savePlan() {
            try {
                const { data, error } = await supabase
                    .from('development_plans')
                    .upsert(this.newPlan)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newPlan = {
                    player_id: '',
                    focus_area: '',
                    description: '',
                    progress: 0,
                    notes: ''
                };
                // Refresh plans
                await this.fetchDevelopmentPlans();
            } catch (err) {
                console.error('Error saving development plan:', err);
                this.error = 'Failed to save development plan';
            }
        },
        getPlayerName(playerId) {
            const player = this.players.find(p => p.id === playerId);
            return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player';
        },
        editPlan(plan) {
            this.newPlan = { ...plan };
            this.showAddModal = true;
        },
        updateProgress(plan) {
            this.selectedPlan = { ...plan };
            this.showProgressModal = true;
        },
        async saveProgress() {
            try {
                const { data, error } = await supabase
                    .from('development_plans')
                    .update({
                        progress: this.selectedPlan.progress,
                        notes: this.selectedPlan.notes
                    })
                    .eq('id', this.selectedPlan.id)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showProgressModal = false;
                this.selectedPlan = null;
                // Refresh plans
                await this.fetchDevelopmentPlans();
            } catch (err) {
                console.error('Error updating progress:', err);
                this.error = 'Failed to update progress';
            }
        }
    },
    mounted() {
        this.fetchPlayers();
        this.fetchDevelopmentPlans();
    }
});

// Tryout Components
Vue.component('tryout-evaluation', {
    data() {
        return {
            tryouts: [],
            loading: true,
            error: null,
            showAddModal: false,
            newTryout: {
                date: '',
                time: '',
                location: '',
                max_participants: '',
                notes: '',
                status: 'upcoming'
            }
        };
    },
    template: `
        <div class="container py-4">
            <h2>Tryout Evaluations</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Schedule Tryout</button>
                </div>
                <div class="row">
                    <div v-for="tryout in tryouts" :key="tryout.id" class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Tryout Session</h5>
                                <div class="mb-2">
                                    <strong>Date:</strong> {{ tryout.date }}
                                </div>
                                <div class="mb-2">
                                    <strong>Time:</strong> {{ tryout.time }}
                                </div>
                                <div class="mb-2">
                                    <strong>Location:</strong> {{ tryout.location }}
                                </div>
                                <div class="mb-2">
                                    <strong>Max Participants:</strong> {{ tryout.max_participants }}
                                </div>
                                <div class="mb-2">
                                    <strong>Status:</strong>
                                    <span :class="'badge ' + (tryout.status === 'upcoming' ? 'bg-primary' : 'bg-success')">
                                        {{ tryout.status }}
                                    </span>
                                </div>
                                <div class="mb-3">
                                    <strong>Notes:</strong>
                                    <p class="mb-0">{{ tryout.notes }}</p>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-info" @click="viewEvaluations(tryout)">View Evaluations</button>
                                    <button class="btn btn-warning" @click="editTryout(tryout)">Edit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Tryout Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newTryout.id ? 'Edit' : 'Schedule' }} Tryout</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="saveTryout">
                                <div class="mb-3">
                                    <label class="form-label">Date</label>
                                    <input type="date" class="form-control" v-model="newTryout.date" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Time</label>
                                    <input type="time" class="form-control" v-model="newTryout.time" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Location</label>
                                    <input type="text" class="form-control" v-model="newTryout.location" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Max Participants</label>
                                    <input type="number" class="form-control" v-model="newTryout.max_participants" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" v-model="newTryout.status" required>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" v-model="newTryout.notes" rows="3"></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchTryouts() {
            try {
                const { data, error } = await supabase
                    .from('tryouts')
                    .select('*')
                    .order('date');
                
                if (error) throw error;
                this.tryouts = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching tryouts:', err);
                this.error = 'Failed to load tryouts';
                this.loading = false;
            }
        },
        async saveTryout() {
            try {
                const { data, error } = await supabase
                    .from('tryouts')
                    .upsert(this.newTryout)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newTryout = {
                    date: '',
                    time: '',
                    location: '',
                    max_participants: '',
                    notes: '',
                    status: 'upcoming'
                };
                // Refresh tryout list
                await this.fetchTryouts();
            } catch (err) {
                console.error('Error saving tryout:', err);
                this.error = 'Failed to save tryout';
            }
        },
        async viewEvaluations(tryout) {
            // TODO: Implement view evaluations
            console.log('Viewing evaluations for tryout:', tryout);
        },
        editTryout(tryout) {
            this.newTryout = { ...tryout };
            this.showAddModal = true;
        }
    },
    mounted() {
        this.fetchTryouts();
    }
});

// Fundraising Components
Vue.component('fundraising', {
    data() {
        return {
            campaigns: [],
            loading: true,
            error: null,
            showAddModal: false,
            newCampaign: {
                title: '',
                description: '',
                goal_amount: '',
                start_date: '',
                end_date: '',
                status: 'active',
                current_amount: 0,
                image_url: ''
            }
        };
    },
    template: `
        <div class="container py-4">
            <h2>Fundraising Campaigns</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Create Campaign</button>
                </div>
                <div class="row">
                    <div v-for="campaign in campaigns" :key="campaign.id" class="col-md-6 mb-4">
                        <div class="card h-100">
                            <img v-if="campaign.image_url" :src="campaign.image_url" class="card-img-top" alt="Campaign Image">
                            <div class="card-body">
                                <h5 class="card-title">{{ campaign.title }}</h5>
                                <div class="mb-2">
                                    <span :class="'badge ' + (campaign.status === 'active' ? 'bg-success' : 'bg-secondary')">
                                        {{ campaign.status }}
                                    </span>
                                </div>
                                <p class="card-text">{{ campaign.description }}</p>
                                <div class="mb-3">
                                    <div class="progress">
                                        <div class="progress-bar" role="progressbar"
                                             :style="{ width: (campaign.current_amount / campaign.goal_amount * 100) + '%' }"
                                             :aria-valuenow="campaign.current_amount"
                                             aria-valuemin="0"
                                             :aria-valuemax="campaign.goal_amount">
                                            {{ Math.round(campaign.current_amount / campaign.goal_amount * 100) }}%
                                        </div>
                                    </div>
                                    <small class="text-muted">
                                        {{ formatCurrency(campaign.current_amount) }} raised of {{ formatCurrency(campaign.goal_amount) }} goal
                                    </small>
                                </div>
                                <div class="mb-2">
                                    <strong>Duration:</strong> {{ campaign.start_date }} - {{ campaign.end_date }}
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-info" @click="viewCampaign(campaign)">View Details</button>
                                    <button class="btn btn-warning" @click="editCampaign(campaign)">Edit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Campaign Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newCampaign.id ? 'Edit' : 'Create' }} Campaign</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="saveCampaign">
                                <div class="mb-3">
                                    <label class="form-label">Title</label>
                                    <input type="text" class="form-control" v-model="newCampaign.title" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" v-model="newCampaign.description" rows="3" required></textarea>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Goal Amount ($)</label>
                                        <input type="number" class="form-control" v-model="newCampaign.goal_amount" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Current Amount ($)</label>
                                        <input type="number" class="form-control" v-model="newCampaign.current_amount" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Start Date</label>
                                        <input type="date" class="form-control" v-model="newCampaign.start_date" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">End Date</label>
                                        <input type="date" class="form-control" v-model="newCampaign.end_date" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" v-model="newCampaign.status" required>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="draft">Draft</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Image URL (optional)</label>
                                        <input type="url" class="form-control" v-model="newCampaign.image_url">
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        formatCurrency(amount) {
            return '$' + amount.toLocaleString();
        },
        async fetchCampaigns() {
            try {
                const { data, error } = await supabase
                    .from('fundraising_campaigns')
                    .select('*')
                    .order('start_date');
                
                if (error) throw error;
                this.campaigns = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching campaigns:', err);
                this.error = 'Failed to load campaigns';
                this.loading = false;
            }
        },
        async saveCampaign() {
            try {
                const { data, error } = await supabase
                    .from('fundraising_campaigns')
                    .upsert(this.newCampaign)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newCampaign = {
                    title: '',
                    description: '',
                    goal_amount: '',
                    start_date: '',
                    end_date: '',
                    status: 'active',
                    current_amount: 0,
                    image_url: ''
                };
                // Refresh campaign list
                await this.fetchCampaigns();
            } catch (err) {
                console.error('Error saving campaign:', err);
                this.error = 'Failed to save campaign';
            }
        },
        viewCampaign(campaign) {
            // TODO: Implement view campaign details
            console.log('Viewing campaign:', campaign);
        },
        editCampaign(campaign) {
            this.newCampaign = { ...campaign };
            this.showAddModal = true;
        }
    },
    mounted() {
        this.fetchCampaigns();
    }
});

// Parent Components
Vue.component('parent-interest', {
    data() {
        return {
            interests: [],
            loading: true,
            error: null,
            showAddModal: false,
            newInterest: {
                parent_name: '',
                email: '',
                phone: '',
                student_name: '',
                student_grade: '',
                volunteer_areas: [],
                notes: ''
            },
            volunteerAreas: [
                'Team Parent',
                'Fundraising',
                'Tournament Support',
                'Transportation',
                'Equipment Management',
                'Social Media',
                'Event Planning'
            ]
        };
    },
    template: `
        <div class="container py-4">
            <h2>Parent Interest</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Add Parent Interest</button>
                </div>
                <div class="row">
                    <div v-for="interest in interests" :key="interest.id" class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">{{ interest.parent_name }}</h5>
                                <div class="mb-2">
                                    <strong>Student:</strong> {{ interest.student_name }} (Grade {{ interest.student_grade }})
                                </div>
                                <div class="mb-2">
                                    <strong>Contact:</strong>
                                    <div>Email: {{ interest.email }}</div>
                                    <div>Phone: {{ interest.phone }}</div>
                                </div>
                                <div class="mb-3">
                                    <strong>Volunteer Areas:</strong>
                                    <div class="mt-1">
                                        <span v-for="area in interest.volunteer_areas" 
                                              :key="area" 
                                              class="badge bg-info me-1 mb-1">
                                            {{ area }}
                                        </span>
                                    </div>
                                </div>
                                <div v-if="interest.notes" class="mb-3">
                                    <strong>Notes:</strong>
                                    <p class="mb-0">{{ interest.notes }}</p>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-info" @click="viewInterest(interest)">View Details</button>
                                    <button class="btn btn-warning" @click="editInterest(interest)">Edit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Interest Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newInterest.id ? 'Edit' : 'Add' }} Parent Interest</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="saveInterest">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Parent Name</label>
                                        <input type="text" class="form-control" v-model="newInterest.parent_name" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" v-model="newInterest.email" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" v-model="newInterest.phone" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Student Grade</label>
                                        <select class="form-select" v-model="newInterest.student_grade" required>
                                            <option value="">Select Grade</option>
                                            <option v-for="grade in [9,10,11,12]" :value="grade">Grade {{ grade }}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Student Name</label>
                                    <input type="text" class="form-control" v-model="newInterest.student_name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Volunteer Areas</label>
                                    <div class="row">
                                        <div class="col-md-6" v-for="area in volunteerAreas" :key="area">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" 
                                                       :value="area" 
                                                       v-model="newInterest.volunteer_areas">
                                                <label class="form-check-label">{{ area }}</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" v-model="newInterest.notes" rows="3"></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchInterests() {
            try {
                const { data, error } = await supabase
                    .from('parent_interest')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                this.interests = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching parent interests:', err);
                this.error = 'Failed to load parent interests';
                this.loading = false;
            }
        },
        async saveInterest() {
            try {
                const { data, error } = await supabase
                    .from('parent_interest')
                    .upsert(this.newInterest)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newInterest = {
                    parent_name: '',
                    email: '',
                    phone: '',
                    student_name: '',
                    student_grade: '',
                    volunteer_areas: [],
                    notes: ''
                };
                // Refresh interest list
                await this.fetchInterests();
            } catch (err) {
                console.error('Error saving parent interest:', err);
                this.error = 'Failed to save parent interest';
            }
        },
        viewInterest(interest) {
            // TODO: Implement view interest details
            console.log('Viewing interest:', interest);
        },
        editInterest(interest) {
            this.newInterest = { ...interest };
            this.showAddModal = true;
        }
    },
    mounted() {
        this.fetchInterests();
    }
});

Vue.component('drills-library', {
    data() {
        return {
            drills: [],
            loading: true,
            error: null,
            showAddModal: false,
            newDrill: {
                name: '',
                description: '',
                difficulty: 'beginner',
                duration: '',
                players_needed: '',
                focus_area: '',
                equipment: '',
                video_url: ''
            },
            difficulties: ['beginner', 'intermediate', 'advanced'],
            focusAreas: [
                'serving',
                'passing',
                'setting',
                'hitting',
                'blocking',
                'defense',
                'team play'
            ]
        };
    },
    template: `
        <div class="container py-4">
            <h2>Drills Library</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Add Drill</button>
                </div>
                <div class="row">
                    <div v-for="drill in drills" :key="drill.id" class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">{{ drill.name }}</h5>
                                <div class="mb-2">
                                    <span class="badge bg-primary me-2">{{ drill.difficulty }}</span>
                                    <span class="badge bg-info">{{ drill.focus_area }}</span>
                                </div>
                                <p class="card-text">{{ drill.description }}</p>
                                <div class="mb-2">
                                    <strong>Duration:</strong> {{ drill.duration }} minutes
                                </div>
                                <div class="mb-2">
                                    <strong>Players Needed:</strong> {{ drill.players_needed }}
                                </div>
                                <div class="mb-2">
                                    <strong>Equipment:</strong> {{ drill.equipment }}
                                </div>
                                <div v-if="drill.video_url" class="mb-3">
                                    <a :href="drill.video_url" target="_blank" class="btn btn-sm btn-secondary">
                                        Watch Demo
                                    </a>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-info" @click="viewDrill(drill)">View Details</button>
                                    <button class="btn btn-warning" @click="editDrill(drill)">Edit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Drill Modal -->
            <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ newDrill.id ? 'Edit' : 'Add' }} Drill</h5>
                            <button type="button" class="btn-close" @click="showAddModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="saveDrill">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Name</label>
                                        <input type="text" class="form-control" v-model="newDrill.name" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Difficulty</label>
                                        <select class="form-select" v-model="newDrill.difficulty" required>
                                            <option v-for="diff in difficulties" :value="diff">
                                                {{ diff.charAt(0).toUpperCase() + diff.slice(1) }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Duration (min)</label>
                                        <input type="number" class="form-control" v-model="newDrill.duration" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" v-model="newDrill.description" rows="3" required></textarea>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Focus Area</label>
                                        <select class="form-select" v-model="newDrill.focus_area" required>
                                            <option v-for="area in focusAreas" :value="area">
                                                {{ area.charAt(0).toUpperCase() + area.slice(1) }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Players Needed</label>
                                        <input type="number" class="form-control" v-model="newDrill.players_needed" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Equipment</label>
                                        <input type="text" class="form-control" v-model="newDrill.equipment" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Video URL (optional)</label>
                                        <input type="url" class="form-control" v-model="newDrill.video_url">
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchDrills() {
            try {
                const { data, error } = await supabase
                    .from('drills')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                this.drills = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching drills:', err);
                this.error = 'Failed to load drills';
                this.loading = false;
            }
        },
        async saveDrill() {
            try {
                const { data, error } = await supabase
                    .from('drills')
                    .upsert(this.newDrill)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newDrill = {
                    name: '',
                    description: '',
                    difficulty: 'beginner',
                    duration: '',
                    players_needed: '',
                    focus_area: '',
                    equipment: '',
                    video_url: ''
                };
                // Refresh drill list
                await this.fetchDrills();
            } catch (err) {
                console.error('Error saving drill:', err);
                this.error = 'Failed to save drill';
            }
        },
        viewDrill(drill) {
            // TODO: Implement view drill details
            console.log('Viewing drill:', drill);
        },
        editDrill(drill) {
            this.newDrill = { ...drill };
            this.showAddModal = true;
        }
    },
    mounted() {
        this.fetchDrills();
    }
});

// Newsletter Component
Vue.component('newsletter-subscription', {
    data() {
        return {
            subscriptions: [],
            loading: true,
            error: null,
            showAddModal: false,
            newSubscription: {
                email: '',
                first_name: '',
                last_name: '',
                subscription_type: ['general'],
                status: 'active'
            },
            subscriptionTypes: [
                'general',
                'team_updates',
                'fundraising',
                'events',
                'tryouts'
            ]
        };
    },
    template: `
        <div class="container py-4">
            <h2>Newsletter Subscriptions</h2>
            <div v-if="loading" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <div class="mb-3">
                    <button class="btn btn-primary" @click="showAddModal = true">Add Subscription</button>
                </div>

                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Subscriptions</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="sub in subscriptions" :key="sub.id">
                                <td>{{ sub.first_name }} {{ sub.last_name }}</td>
                                <td>{{ sub.email }}</td>
                                <td>
                                    <div class="d-flex flex-wrap gap-1">
                                        <span v-for="type in sub.subscription_type" 
                                              :key="type"
                                              class="badge bg-info">
                                            {{ type }}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span :class="{
                                        'badge': true,
                                        'bg-success': sub.status === 'active',
                                        'bg-warning': sub.status === 'unsubscribed',
                                        'bg-danger': sub.status === 'bounced'
                                    }">
                                        {{ sub.status }}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-warning" @click="editSubscription(sub)">Edit</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Add/Edit Subscription Modal -->
                <div class="modal fade" :class="{ show: showAddModal }" tabindex="-1" v-if="showAddModal">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Newsletter Subscription</h5>
                                <button type="button" class="btn-close" @click="showAddModal = false"></button>
                            </div>
                            <div class="modal-body">
                                <form @submit.prevent="saveSubscription">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">First Name</label>
                                            <input type="text" class="form-control" v-model="newSubscription.first_name">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Last Name</label>
                                            <input type="text" class="form-control" v-model="newSubscription.last_name">
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" v-model="newSubscription.email" required>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Subscription Types</label>
                                        <div class="row">
                                            <div class="col-md-6" v-for="type in subscriptionTypes">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" 
                                                           :value="type" 
                                                           v-model="newSubscription.subscription_type">
                                                    <label class="form-check-label">
                                                        {{ type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') }}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" v-model="newSubscription.status" required>
                                            <option value="active">Active</option>
                                            <option value="unsubscribed">Unsubscribed</option>
                                            <option value="bounced">Bounced</option>
                                        </select>
                                    </div>

                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
                                        <button type="submit" class="btn btn-primary">Save Subscription</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        async fetchSubscriptions() {
            try {
                const { data, error } = await supabase
                    .from('newsletter_subscriptions')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                this.subscriptions = data;
                this.loading = false;
            } catch (err) {
                console.error('Error fetching subscriptions:', err);
                this.error = 'Failed to load subscriptions';
                this.loading = false;
            }
        },
        async saveSubscription() {
            try {
                const { data, error } = await supabase
                    .from('newsletter_subscriptions')
                    .upsert(this.newSubscription)
                    .select()
                    .single();
                
                if (error) throw error;
                
                this.showAddModal = false;
                // Reset form
                this.newSubscription = {
                    email: '',
                    first_name: '',
                    last_name: '',
                    subscription_type: ['general'],
                    status: 'active'
                };
                // Refresh subscriptions
                await this.fetchSubscriptions();
            } catch (err) {
                console.error('Error saving subscription:', err);
                this.error = 'Failed to save subscription';
            }
        },
        editSubscription(subscription) {
            this.newSubscription = { ...subscription };
            this.showAddModal = true;
        }
    },
    mounted() {
        this.fetchSubscriptions();
    }
});

// Video Analysis Component
Vue.component('video-analysis', {
    data() {
        return {
            loading: false,
            error: null,
            videoFile: null,
            videoUrl: null,
            analysisType: 'technique', // Default analysis type
            analysisResults: null,
            analysisInProgress: false,
            playersList: [],
            selectedPlayer: null
        };
    },
    mounted() {
        console.log('Video analysis component mounted');
        this.fetchPlayers();
    },
    methods: {
        fetchPlayers() {
            console.log('Fetching players for video analysis');
            this.loading = true;
            
            supabase
                .from('players')
                .select('*')
                .then(({ data, error }) => {
                    this.loading = false;
                    if (error) {
                        console.error('Error fetching players:', error);
                        this.error = 'Failed to load players: ' + error.message;
                    } else {
                        this.playersList = data || [];
                        console.log('Players loaded:', this.playersList.length);
                    }
                });
        },
        
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Check if file is a video
            if (!file.type.startsWith('video/')) {
                this.error = 'Please upload a video file';
                return;
            }
            
            this.videoFile = file;
            this.videoUrl = URL.createObjectURL(file);
            this.error = null;
            this.analysisResults = null;
        },
        
        async analyzeVideo() {
            if (!this.videoFile) {
                this.error = 'Please upload a video first';
                return;
            }
            
            this.analysisInProgress = true;
            this.error = null;
            
            try {
                // Simulate video analysis (in a real app, this would call an API)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Mock analysis results
                this.analysisResults = {
                    technique: {
                        score: Math.floor(Math.random() * 100),
                        feedback: [
                            'Good arm swing mechanics',
                            'Needs improvement on footwork',
                            'Consistent follow-through on serves'
                        ]
                    },
                    positioning: {
                        score: Math.floor(Math.random() * 100),
                        feedback: [
                            'Good court awareness',
                            'Proper defensive positioning',
                            'Could improve transition speed'
                        ]
                    },
                    recommendations: [
                        'Focus on approach timing for attacks',
                        'Practice quick transitions between offense and defense',
                        'Work on consistent serving technique'
                    ]
                };
                
                console.log('Analysis complete:', this.analysisResults);
            } catch (err) {
                console.error('Error analyzing video:', err);
                this.error = 'Failed to analyze video: ' + err.message;
            } finally {
                this.analysisInProgress = false;
            }
        },
        
        resetAnalysis() {
            this.videoFile = null;
            this.videoUrl = null;
            this.analysisResults = null;
            this.error = null;
            // Reset file input
            const fileInput = this.$refs.videoInput;
            if (fileInput) fileInput.value = '';
        }
    },
    template: `
        <div class="container py-4">
            <h2 class="mb-4">Video Analysis</h2>
            
            <div class="alert alert-info mb-4">
                <h5>How it works:</h5>
                <p>Upload a volleyball video to analyze player technique, positioning, and get personalized recommendations.</p>
                <ol>
                    <li>Select a player (optional)</li>
                    <li>Upload a video file</li>
                    <li>Choose analysis type</li>
                    <li>Click "Analyze Video"</li>
                </ol>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Upload Video</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="playerSelect" class="form-label">Select Player (Optional)</label>
                                <select id="playerSelect" class="form-select" v-model="selectedPlayer">
                                    <option value="">-- Select Player --</option>
                                    <option v-for="player in playersList" :value="player.id">
                                        {{ player.first_name }} {{ player.last_name }}
                                    </option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="videoInput" class="form-label">Upload Video File</label>
                                <input 
                                    type="file" 
                                    class="form-control" 
                                    id="videoInput" 
                                    ref="videoInput"
                                    accept="video/*" 
                                    @change="handleFileUpload"
                                />
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Analysis Type</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="typeTechnique" value="technique" v-model="analysisType">
                                    <label class="form-check-label" for="typeTechnique">Technique Analysis</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="typePositioning" value="positioning" v-model="analysisType">
                                    <label class="form-check-label" for="typePositioning">Positioning Analysis</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="typeTactics" value="tactics" v-model="analysisType">
                                    <label class="form-check-label" for="typeTactics">Team Tactics Analysis</label>
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2">
                                <button 
                                    class="btn btn-primary" 
                                    @click="analyzeVideo" 
                                    :disabled="!videoFile || analysisInProgress"
                                >
                                    <span v-if="analysisInProgress">
                                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        Analyzing...
                                    </span>
                                    <span v-else>Analyze Video</span>
                                </button>
                                <button class="btn btn-outline-secondary" @click="resetAnalysis">Reset</button>
                            </div>
                            
                            <div v-if="error" class="alert alert-danger mt-3">
                                {{ error }}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-4" v-if="videoUrl">
                        <div class="card-header">
                            <h5 class="mb-0">Video Preview</h5>
                        </div>
                        <div class="card-body">
                            <video 
                                controls 
                                class="w-100" 
                                :src="videoUrl"
                                style="max-height: 300px; object-fit: contain;"
                            ></video>
                        </div>
                    </div>
                    
                    <div class="card" v-if="analysisResults">
                        <div class="card-header">
                            <h5 class="mb-0">Analysis Results</h5>
                        </div>
                        <div class="card-body">
                            <div v-if="analysisType === 'technique' || analysisType === 'all'">
                                <h6>Technique Analysis</h6>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span>Technique Score:</span>
                                        <span class="badge bg-primary">{{ analysisResults.technique.score }}/100</span>
                                    </div>
                                    <div class="progress">
                                        <div 
                                            class="progress-bar" 
                                            role="progressbar" 
                                            :style="{ width: analysisResults.technique.score + '%' }" 
                                            :aria-valuenow="analysisResults.technique.score" 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                </div>
                                <h6>Feedback:</h6>
                                <ul class="list-group mb-3">
                                    <li class="list-group-item" v-for="item in analysisResults.technique.feedback">
                                        {{ item }}
                                    </li>
                                </ul>
                            </div>
                            
                            <div v-if="analysisType === 'positioning' || analysisType === 'all'">
                                <h6>Positioning Analysis</h6>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span>Positioning Score:</span>
                                        <span class="badge bg-primary">{{ analysisResults.positioning.score }}/100</span>
                                    </div>
                                    <div class="progress">
                                        <div 
                                            class="progress-bar" 
                                            role="progressbar" 
                                            :style="{ width: analysisResults.positioning.score + '%' }" 
                                            :aria-valuenow="analysisResults.positioning.score" 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                </div>
                                <h6>Feedback:</h6>
                                <ul class="list-group mb-3">
                                    <li class="list-group-item" v-for="item in analysisResults.positioning.feedback">
                                        {{ item }}
                                    </li>
                                </ul>
                            </div>
                            
                            <div>
                                <h6>Recommendations:</h6>
                                <ul class="list-group">
                                    <li class="list-group-item" v-for="item in analysisResults.recommendations">
                                        {{ item }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}); 