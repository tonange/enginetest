function helloWorld() {
  return 'Hello world!';
}

describe('failed Hello world', function () {
  it('says hello', function () {
    expect(helloWorld()).toEqual('Hello, world!');
  });
});
