import { Controller, Get, Route, SuccessResponse } from '@namecheap/tsoa-runtime';
import { TestModel as Response } from '../testModel';
import { ModelService } from 'fixtures/services/modelService';

@Route('Controller')
export class CustomResponseDescController extends Controller {
  @Get('descriptionWithSuccessResponse')
  @SuccessResponse(200, 'SuccessResponse description')
  public async descriptionWithSuccessResponse(): Promise<Response> {
    return new ModelService().getModel();
  }

  /** @returns custom description with jsdoc annotation */
  @Get('descriptionWithJsDocAnnotation')
  public async descriptionWithJsDocAnnotation(): Promise<Response> {
    return new ModelService().getModel();
  }

  @Get('successResponseAndJsDocAnnotation')
  /**
   * @returns custom description from jsdoc annotation
   */
  @SuccessResponse(200, 'Success Response description')
  public async successResponseAndJsDocAnnotation(): Promise<Response> {
    return new ModelService().getModel();
  }
}
