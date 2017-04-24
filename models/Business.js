const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  business: {
    name: String,
    phone: String,
    street_address: String,
    address_locality: String,
    address_region: String,
    postal_code: String,
    category: String,
    price_range: String,
    star_rating: String,
    review_count: String,
    website: String,
    email: String,
    contact_person: String,
    contact_title: String,
    page_url: { type: String, unique: true },
    scraper: String,
    saved: Date,
    updated: Date,
    filtered: Date,
    filter_type: String
  }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
businessSchema.pre('save', function save(next) {
  var currentDate = new Date();
  this.updated = currentDate;

  if (!this.saved) {
    this.saved = currentDate;
  }
  next();
});

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
