import Controller from '@ember/controller';

export default class MentionsController extends Controller {
    get mentionsInfinityModel() {
        return this.model;
    }
}
