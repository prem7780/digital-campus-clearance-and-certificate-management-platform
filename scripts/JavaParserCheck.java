import com.sun.source.util.JavacTask;
import javax.tools.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;
public class JavaParserCheck {
 public static void main(String[] args) throws Exception {
  var compiler=ToolProvider.getSystemJavaCompiler();
  var diag=new DiagnosticCollector<JavaFileObject>();
  var manager=compiler.getStandardFileManager(diag,null,null);
  var javaFiles=Files.walk(Path.of(args[0])).filter(x->x.toString().endsWith(".java")).map(Path::toFile).toList();
  JavacTask task=(JavacTask)compiler.getTask(null,manager,diag,List.of("-proc:none","--release","21"),null,manager.getJavaFileObjectsFromFiles(javaFiles));
  task.parse();
  var errors=diag.getDiagnostics().stream().filter(x->x.getKind()==Diagnostic.Kind.ERROR).toList();
  for(var d:errors)System.out.println("SYNTAX ERROR: "+d);
  if(!errors.isEmpty())System.exit(1);
  System.out.println("PASS: parsed "+javaFiles.size()+" Java 21 files (syntax only, dependencies not resolved)");
 }
}
