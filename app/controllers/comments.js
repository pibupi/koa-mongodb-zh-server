const Comment = require('../models/comments')

class CommentCls {
  async find(ctx) {
    const { per_page = 10 } = ctx.query
    const page = Math.max(ctx.query.page * 1, 1) - 1
    const perPage = Math.max(per_page * 1, 1)
    const q = new RegExp(ctx.query.q)
    const { questionId, answerId } = ctx.params
    const { rootCommentId } = ctx.query
    ctx.body = await Comment.find({
      content: q,
      questionId,
      answerId,
      rootCommentId
    })
      .limit(perPage)
      .skip(page * perPage)
      .populate('commentator replyTo')
  }
  async checkCommentExist(ctx, next) {
    const comment = await Comment.findById(ctx.params.id).select('+commentator')
    if (!comment) {
      ctx.throw(404, '评论不存在')
    }
    // 只有删改查评论的时候才检查此逻辑，赞、踩答案的时候不检查
    if (
      ctx.params.questionId &&
      comment.questionId.toString() !== ctx.params.questionId
    ) {
      ctx.throw(404, '该问题下没有此评论')
    }
    if (
      ctx.params.answerId &&
      comment.answerId.toString() !== ctx.params.questionId
    ) {
      ctx.throw(404, '该答案下没有此评论')
    }
    ctx.state.comment = comment
    await next()
  }
  async findById(ctx) {
    const { fields = '' } = ctx.query
    const selectFields = fields
      .split(';')
      .filter(f => f)
      .map(f => ' +' + f)
      .join('')
    const comment = await Comment.findById(ctx.params.id)
      .select(selectFields)
      .populate('commentator')
    ctx.body = comment
  }
  async create(ctx) {
    ctx.verifyParams({
      content: { type: 'string', required: true },
      rootCommentId: { type: 'string', required: true },
      replyTo: { type: 'string', required: true }
    })
    const commentator = ctx.state.user._id
    const { questionId, answerId } = ctx.params
    const comment = await new Comment({
      ...ctx.request.body,
      commentator,
      questionId,
      answerId
    }).save()
    ctx.body = comment
  }
  async checkCommentator(ctx, next) {
    const { Comment } = ctx.state
    if (Comment.commentator.toString() !== ctx.state.user._id) {
      ctx.throw(403, '没有权限')
    }
    await next()
  }
  async update(ctx) {
    ctx.verifyParams({
      content: { type: 'string', required: false }
    })
    const { content } = ctx.request.body
    await ctx.state.Comment.update(content)
    ctx.body = ctx.state.Comment
  }
  async delete(ctx) {
    await Comment.findByIdAndRemove(ctx.params.id)
    ctx.status = 204
  }
}
module.exports = new CommentCls()
