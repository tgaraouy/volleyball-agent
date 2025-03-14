/* global Vue, VueRouter */

// Define routes - we'll initialize this after components are loaded
let router;

// Function to initialize router after components are loaded
window.initRouter = function() {
    console.log('Initializing router...');
    
    // Define routes
    const routes = [
        {
            path: '/',
            component: {
                template: `
                    <div class="container py-5">
                        <h1 class="text-center mb-4">Welcome to Volleyball Program Management</h1>
                        <p class="lead text-center mb-5">Manage your volleyball program efficiently with our comprehensive tools and features.</p>
                        
                        <div class="row g-4">
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Player Management</h5>
                                        <p class="card-text">Manage your team roster, track player development, and maintain player information.</p>
                                        <router-link to="/players" class="btn btn-primary">View Players</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Tryouts</h5>
                                        <p class="card-text">Schedule and manage tryout sessions, evaluate players, and track results.</p>
                                        <router-link to="/tryouts" class="btn btn-primary">Manage Tryouts</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Drills Library</h5>
                                        <p class="card-text">Access and manage a comprehensive library of volleyball drills and training exercises.</p>
                                        <router-link to="/drills" class="btn btn-primary">View Drills</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Video Analysis</h5>
                                        <p class="card-text">Analyze player technique, positioning, and team tactics using video uploads.</p>
                                        <router-link to="/analysis" class="btn btn-primary">Analyze Videos</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Fundraising</h5>
                                        <p class="card-text">Organize and track fundraising campaigns to support your program.</p>
                                        <router-link to="/fundraising" class="btn btn-primary">View Campaigns</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Parent Portal</h5>
                                        <p class="card-text">Manage parent communications and volunteer opportunities.</p>
                                        <router-link to="/parents" class="btn btn-primary">Parent Portal</router-link>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">Newsletter</h5>
                                        <p class="card-text">Manage newsletter subscriptions and communications.</p>
                                        <router-link to="/newsletter" class="btn btn-primary">Manage Newsletter</router-link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }
        },
        {
            path: '/test',
            component: {
                template: `
                    <div class="container py-5">
                        <h2>Component Test Page</h2>
                        
                        <div class="card mb-4">
                            <div class="card-header">Test Component</div>
                            <div class="card-body">
                                <test-component></test-component>
                            </div>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header">Player Roster Component</div>
                            <div class="card-body">
                                <player-roster></player-roster>
                            </div>
                        </div>
                    </div>
                `
            }
        },
        {
            path: '/players',
            component: Vue.options.components['player-roster']
        },
        {
            path: '/players/development',
            component: Vue.options.components['player-development']
        },
        {
            path: '/tryouts',
            component: Vue.options.components['tryout-evaluation']
        },
        {
            path: '/drills',
            component: Vue.options.components['drills-library']
        },
        {
            path: '/fundraising',
            component: Vue.options.components['fundraising']
        },
        {
            path: '/parents',
            component: Vue.options.components['parent-interest']
        },
        {
            path: '/newsletter',
            component: Vue.options.components['newsletter-manager']
        },
        {
            path: '/analysis',
            component: Vue.options.components['video-analysis']
        }
    ];

    // Create router instance
    router = new VueRouter({
        routes
    });

    // Make router available globally
    window.router = router;
    
    console.log('Router initialized with routes:', routes);
    return router;
}; 