const { logger } = require('@/helpers');

const paginatedList = async (Model, req, res) => {
  if (req.route.path === '/payment/list') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay
    logger.info('get payments - 5 seconds delayed');
  }

  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  const { sortBy = 'enabled', sortValue = -1, filter, equal } = req.query;

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  let fields = {};

  // Only create $or structure if we have both fields and a search query
  if (fieldsArray.length > 0 && req.query.q) {
    // Cache regex to prevent memory leaks - escape special characters
    let searchRegex;
    try {
      // Escape special regex characters to prevent ReDoS attacks and memory issues
      const escapedQuery = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(escapedQuery, 'i');
    } catch (error) {
      // If regex creation fails, return error
      return res.status(400).json({
        success: false,
        result: null,
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

  //  Query the database for a list of all results
  const resultsPromise = Model.find({
    removed: false,

    [filter]: equal,
    ...fields,
  })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortValue })
    .lean() // Use lean() to reduce memory footprint instead of populate()
    .exec();

  // Counting the total documents
  const countPromise = Model.countDocuments({
    removed: false,

    [filter]: equal,
    ...fields,
  });
  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;
