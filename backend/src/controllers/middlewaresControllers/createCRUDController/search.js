const search = async (Model, req, res) => {
  // console.log(req.query.fields)
  // if (req.query.q === undefined || req.query.q.trim() === '') {
  //   return res
  //     .status(202)
  //     .json({
  //       success: false,
  //       result: [],
  //       message: 'No document found by this request',
  //     })
  //     .end();
  // }
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['name'];

  let fields = {};

  // Only create $or structure if we have a search query
  if (req.query.q) {
    // Cache regex to prevent memory leaks - escape special characters
    let searchRegex;
    try {
      const escapedQuery = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(escapedQuery, 'i');
    } catch (error) {
      return res.status(400).json({
        success: false,
        result: [],
        message: 'Invalid search query',
      });
    }

    // Build $or array only if we have a valid regex
    if (searchRegex) {
      fields.$or = [];
      for (const field of fieldsArray) {
        fields.$or.push({ [field]: { $regex: searchRegex } });
      }
    }
  }
  // console.log(fields)

  let results = await Model.find({
    ...fields,
  })

    .where('removed', false)
    .limit(20)
    .exec();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
