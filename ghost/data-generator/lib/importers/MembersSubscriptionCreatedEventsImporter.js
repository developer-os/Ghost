const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersSubscriptionCreatedEventsImporter extends TableImporter {
    static table = 'members_subscription_created_events';
    static dependencies = ['members_stripe_customers_subscriptions', 'posts', 'mentions'];

    constructor(knex, transaction) {
        super(MembersSubscriptionCreatedEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const membersStripeCustomersSubscriptions = await this.transaction.select('id', 'created_at', 'customer_id').from('members_stripe_customers_subscriptions');
        this.membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers');
        this.posts = await this.transaction.select('id', 'published_at', 'visibility', 'type', 'slug').from('posts').orderBy('published_at', 'desc');
        this.incomingRecommendations = await this.transaction.select('id', 'source', 'created_at').from('mentions');

        await this.importForEach(membersStripeCustomersSubscriptions, quantity ? quantity / membersStripeCustomersSubscriptions.length : 1);
    }

    generate() {
        let attribution = {};
        let referrer = {};

        if (luck(30)) {
            const post = this.posts.find(p => p.visibility === 'public' && new Date(p.published_at) < new Date(this.model.created_at));
            if (post) {
                attribution = {
                    attribution_id: post.id,
                    attribution_type: post.type,
                    attribution_url: post.slug
                };
            }
        }

        if (luck(40)) {
            if (luck(20)) {
                // Ghost network
                referrer = {
                    referrer_source: luck(20) ? 'Ghost.org' : 'Ghost Explore',
                    referrer_url: 'ghost.org',
                    referrer_medium: 'Ghost Network'
                };
            } else {
                // Incoming recommendation
                const incomingRecommendation = faker.helpers.arrayElement(this.incomingRecommendations);

                const hostname = new URL(incomingRecommendation.source).hostname;
                referrer = {
                    referrer_source: hostname,
                    referrer_url: hostname,
                    referrer_medium: faker.helpers.arrayElement([null, 'Email'])
                };
            }
        }

        const memberCustomer = this.membersStripeCustomers.find(c => c.customer_id === this.model.customer_id);

        return {
            id: faker.database.mongodbObjectId(),
            created_at: this.model.created_at,
            member_id: memberCustomer.member_id,
            subscription_id: this.model.id,
            ...attribution,
            ...referrer
        };
    }
}

module.exports = MembersSubscriptionCreatedEventsImporter;
