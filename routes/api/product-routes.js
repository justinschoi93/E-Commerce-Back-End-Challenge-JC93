const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

//GET ROUTE: Will select for entire Product table
router.get('/', async (req, res) => {
  
  try{
    const productData = await Product.findAll({
      include: [{ model: Category, Tag}]
    });
    
    res.status(200).json(productData);
  } catch(err) {
    res.status(500).json(err);
  }

 
});

//GET ROUTE: Will select for specific row of Product Table
router.get('/:id', (req, res) => {

  try {
    const productData = Product.findByPk( req.params.id,
      {
        include: [{model: Category}]
      }
    );

    if (!productData) {
      res.status(404).json({message: 'No product found with this id. '})
    }
  return res.status(200).json(productData);

 } catch (err) {
    res.status(500).json(err);
  }

});

//POST ROUTE: Will create a row or rows for the Product table
router.post('/', (req, res) => {

  Product.create(req.body)
    .then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// PUT ROUTE: Will make changes to the specified row of the Product table
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      if (req.body.tagIds && req.body.tagIds.length) {

        ProductTag.findAll({
          where: { product_id: req.params.id }
        }).then((productTags) => {
          // create filtered list of new tag_ids
          const productTagIds = productTags.map(({ tag_id }) => tag_id);
          const newProductTags = req.body.tagIds
            .filter((tag_id) => !productTagIds.includes(tag_id))
            .map((tag_id) => {
              return {
                product_id: req.params.id,
                tag_id,
              };
            });

          // figure out which ones to remove
          const productTagsToRemove = productTags
            .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
            .map(({ id }) => id);
          // run both actions
          return Promise.all([
            ProductTag.destroy({ where: { id: productTagsToRemove } }),
            ProductTag.bulkCreate(newProductTags),
          ]);
        });
      }

      return res.json(product);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// DELETE ROUTE: Will delete a specific row of the Product table
router.delete('/:id', async (req, res) => {
  try {
    const productData = await Product.destroy({
      where: {
        id: req.params.id
      }
    });

    if (!productData) {
      res.status(404).json({ message: 'No product found with this id!' });
      return;
    }

    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
