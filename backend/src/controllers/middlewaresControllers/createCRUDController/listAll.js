const listAll = async (Model, req, res) => {
  const sort = req.query.sort || 'desc';
  const enabled = req.query.enabled || undefined;

  //  Query the database for a list of all results

  // CRITICAL FIX: .populate() without arguments loads ALL referenced fields
  // This can cause massive memory leaks. Use lean() instead or specify fields.
  // Also add a limit to prevent loading entire collections into memory
  const maxResults = parseInt(req.query.limit) || 1000; // Default limit of 1000
  
  let result;
  if (enabled === undefined) {
    result = await Model.find({
      removed: false,
    })
      .sort({ created: sort })
      .limit(maxResults)
      .lean() // Use lean() to reduce memory footprint
      .exec();
  } else {
    result = await Model.find({
      removed: false,
      enabled: enabled,
    })
      .sort({ created: sort })
      .limit(maxResults)
      .lean() // Use lean() to reduce memory footprint
      .exec();
  }

  if (result.length > 0) {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = listAll;
