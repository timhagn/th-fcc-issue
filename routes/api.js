/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

// For local development.
require('dotenv').config();

const expect = require('chai').expect;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const shortid = require('shortid');

// Connect to DB.
mongoose.connect(
    process.env.MONGO_URI || process.env.MONGO_LOCAL,
    { useNewUrlParser: true }
);

// Issue Tracker - Schemas
const IssueSchema = new Schema({
  _id: {
    type: Schema.Types.Mixed,
    default: shortid.generate
  },
  project_name: { type: String, required: true },
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_by: { type: String, required: true },
  assigned_to: { type: String, default: '' },
  status_text: { type: String, default: '' },
  created_on: { type: Date, default: Date.now },
  updated_on: { type: Date, default: Date.now },
  open: {type: Boolean, default: true }
});
const Issue = mongoose.model('Issue', IssueSchema);

// Add helmet() to prevent MIME type & XSS attacks.
const helmet = require('helmet');

module.exports = function (app) {

  // Async function to get filtered Issues.
  function getFilteredIssues(project_name, filters) {
    return new Promise((resolve, reject) => {
      Issue.find(
          {project_name, ...filters},
          (err, issue) => err ? reject(null) : resolve(issue)
      );
    });
  }

  // Async function to get all Issues by project_name.
  function getAllIssuesByProject(project_name) {
    return new Promise((resolve, reject) => {
      Issue.find(
          {project_name},
          (err, issue) => err ? reject(null) : resolve(issue)
      );
    });
  }

  // Async function to Create an Issue.
  function createIssue(project_name, issue) {
    return new Promise((resolve, reject) => {
      let newIssue = {
        project_name,
        ...issue
      };
      let issueToSave = new Issue(newIssue);
      issueToSave.save((err, data) =>
          err ? reject(null) : resolve(data));
    });
  }

  // Async function to get Issue by _id and update.
  function findIssueByIdAndUpdate(id, values) {
    return new Promise((resolve, reject) => {
      Issue.updateOne(
          { _id: id },
          values,
          (err, issue) => err ? reject(null) : resolve(issue)
      );
    });
  }

  // Async function to delete Issue by _id.
  function deleteIssueById(id) {
    return new Promise((resolve, reject) => {
      Issue.findOneAndDelete(
          { _id: id },
          (err, issue) => err ? reject(null) : resolve(issue)
      );
    });
  }

  app.use(helmet());

  app.route('/api/issues/:project')
    .get(async function (req, res) {
      let project = req.params.project;
      if (Object.keys(req.query).length === 0) {
        let unfiltered = await getAllIssuesByProject(project);
        res.json(unfiltered);
      }
      else {
        let filtered = await getFilteredIssues(project, req.query);
        res.json(filtered);
      }
    })

    .post(async function (req, res) {
      let project = req.params.project;
      // Check if required fields are there and create issue or return error.
      let { issue_title,
            issue_text,
            created_by } = req.body;
      if (issue_title && issue_text && created_by ) {
        let created = await createIssue(project, req.body);
        if (created !== null) {
          res.send(created);
        }
        else {
          res.json({ error: 'error saving issue'});
        }
      }
      else {
        res.json({ error: 'missing required fields'});
      }
    })

    .put(async function (req, res) {
      let project = req.params.project;
      if (req.body._id) {
        // TODO: fix this -.-
        let updateObject = {};
        Object.keys(req.body).map((item, value) => {
          if (item !== '_id')
            updateObject[item] = value;
        });
        updateObject.updated_on = Date.now();
        updateObject.project_name = project;
        let updated = await findIssueByIdAndUpdate(req.body._id, updateObject);
        if (updated) {
          res.json({ success: 'successfully updated' });
        }
        else {
          res.json({ error: 'could not update '+ req.body._id })
        }
      }
      else {
        res.json({ error: 'no updated field sent' })
      }
    })

    .delete(async function (req, res) {
      let project = req.params.project;
      // Shall all issues be deleted?
      let id = req.body._id;
      if (id === 'delall') {
        Issue.deleteMany({});
        res.json({ success: 'deleted *' });
      }
      else if (id) {
        // Do we at least have an valid _id?
        // Then try to delete issue or return error.
        let deletedIssue = await deleteIssueById(id);
        if (deletedIssue) {
          res.json({success: 'deleted ' + id})
        }
        else {
          res.json({error: 'could not delete ' + id})
        }
      }
      else {
        res.json({error: '_id error'})
      }
    });
};
