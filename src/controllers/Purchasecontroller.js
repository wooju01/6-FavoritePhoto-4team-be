import express from 'express';
import passport from 'passport';
import * as purchaseService from '../services/Purchaseservice.js';

const purchaseRouter = express.Router();

purchaseRouter.post(
  '/cards/:id/purchase',
  passport.authenticate('access-token', { session: false }),
  async (req, res, next) => {
    try {
      const saleId = Number(req.params.id);
      const buyerId = req.user.id;
      const quantity = Number(req.body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: '구매 수량을 올바르게 입력해주세요.' });
      }

      const io = req.app.get('io');
      const purchaseResult = await purchaseService.purchaseCards(saleId, buyerId, quantity, io);

      return res.status(200).json(purchaseResult);
    } catch (error) {
      next(error);
    }
  }
);

export default purchaseRouter;
