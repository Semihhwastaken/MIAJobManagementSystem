// MongoDB script to remove the assignedTo and startDate fields from all documents in the Tasks collection
db = db.getSiblingDB("JobTrackingDb");

// Update all documents in the Tasks collection to remove the assignedTo field
const resultAssignedTo = db.Tasks.updateMany(
  { assignedTo: { $exists: true } }, // filter for documents that have assignedTo field
  { $unset: { assignedTo: "" } } // remove the assignedTo field
);

// Print the result
print("AssignedTo - Modified documents count: " + resultAssignedTo.modifiedCount);
print("AssignedTo - Matched documents count: " + resultAssignedTo.matchedCount);

// Update all documents in the Tasks collection to remove the startDate field
const resultStartDate = db.Tasks.updateMany(
  { startDate: { $exists: true } }, // filter for documents that have startDate field
  { $unset: { startDate: "" } } // remove the startDate field
);

// Print the result
print("StartDate - Modified documents count: " + resultStartDate.modifiedCount);
print("StartDate - Matched documents count: " + resultStartDate.matchedCount);

const resultDifficulty = db.Tasks.updateMany(
  { difficulty: { $exists: true } }, // filter for documents that have difficulty field
  { $unset: { difficulty: "" } } // remove the difficulty field
);

// Print the result
print("Difficulty - Modified documents count: " + resultDifficulty.modifiedCount);
print("Difficulty - Matched documents count: " + resultDifficulty.matchedCount);